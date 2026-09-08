import { useCallback, useRef, useState } from "react";

import {
  abortRecording,
  completeRecording,
  getRecordingPartUrl,
  initiateRecording,
} from "../api/consultationApi";
import { getApiData } from "../utils/apiHelpers";

// S3/MinIO multipart: every part except the last must be >= 5 MiB.
const MIN_PART_SIZE = 5 * 1024 * 1024;
const CANVAS_W = 1280;
const CANVAS_H = 720;

/**
 * useCallRecorder — records a single composited .webm of the call
 * (remote video full-frame + local video picture-in-picture, both audio
 * tracks mixed) and streams it to MinIO via presigned multipart upload.
 *
 * Only the designated recorder (the doctor) uses this.
 */
export default function useCallRecorder(roomCode, localStream, remoteStream) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");

  const recorderRef = useRef(null);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const videoElsRef = useRef([]);

  const recordingIdRef = useRef(null);
  const partNumberRef = useRef(1);
  const uploadedPartsRef = useRef([]);
  const bufferRef = useRef([]);
  const bufferedSizeRef = useRef(0);
  const totalSizeRef = useRef(0);
  const startTimeRef = useRef(0);
  const uploadChainRef = useRef(Promise.resolve());

  // -------------------------------------------------------------
  // Build the composited stream: canvas video + mixed audio.
  // -------------------------------------------------------------
  const buildCompositeStream = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");

    const makeVideo = (stream) => {
      const v = document.createElement("video");
      v.srcObject = stream;
      v.muted = true;
      v.playsInline = true;
      v.play().catch(() => {});
      return v;
    };

    const remoteVideo = remoteStream ? makeVideo(remoteStream) : null;
    const localVideo = localStream ? makeVideo(localStream) : null;
    videoElsRef.current = [remoteVideo, localVideo].filter(Boolean);

    const draw = () => {
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (remoteVideo && remoteVideo.readyState >= 2) {
        ctx.drawImage(remoteVideo, 0, 0, CANVAS_W, CANVAS_H);
      }
      if (localVideo && localVideo.readyState >= 2) {
        const pw = 320;
        const ph = 180;
        const margin = 20;
        ctx.drawImage(
          localVideo,
          CANVAS_W - pw - margin,
          CANVAS_H - ph - margin,
          pw,
          ph
        );
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    const canvasStream = canvas.captureStream(30);

    // Mix audio from both peers into one track.
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    audioCtxRef.current = audioCtx;
    const dest = audioCtx.createMediaStreamDestination();

    [localStream, remoteStream].forEach((stream) => {
      if (stream && stream.getAudioTracks().length) {
        try {
          audioCtx.createMediaStreamSource(stream).connect(dest);
        } catch {
          // ignore sources that can't be connected
        }
      }
    });

    return new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
  }, [localStream, remoteStream]);

  // -------------------------------------------------------------
  // Upload one multipart part and remember its ETag.
  // -------------------------------------------------------------
  const uploadPart = useCallback(
    async (blob, partNumber) => {
      const res = await getRecordingPartUrl(
        roomCode,
        recordingIdRef.current,
        partNumber
      );
      const url = getApiData(res)?.url;
      if (!url) throw new Error("No upload URL returned");

      const putRes = await fetch(url, { method: "PUT", body: blob });
      if (!putRes.ok) throw new Error("Recording part upload failed");

      let etag =
        putRes.headers.get("ETag") || putRes.headers.get("etag");
      if (!etag) {
        throw new Error(
          "Missing ETag from storage (check MinIO CORS ExposeHeaders)"
        );
      }
      etag = etag.replace(/"/g, "");
      uploadedPartsRef.current.push({
        part_number: partNumber,
        etag,
      });
    },
    [roomCode]
  );

  // -------------------------------------------------------------
  // Flush the buffered chunks as one part (final = allow < 5 MiB).
  // -------------------------------------------------------------
  const flushBuffer = useCallback(
    (final) => {
      const size = bufferedSizeRef.current;
      if (size === 0) return uploadChainRef.current;
      if (!final && size < MIN_PART_SIZE) return uploadChainRef.current;

      const blob = new Blob(bufferRef.current, { type: "video/webm" });
      bufferRef.current = [];
      bufferedSizeRef.current = 0;
      const partNumber = partNumberRef.current;
      partNumberRef.current += 1;

      uploadChainRef.current = uploadChainRef.current.then(() =>
        uploadPart(blob, partNumber).catch((e) => setError(e.message))
      );
      return uploadChainRef.current;
    },
    [uploadPart]
  );

  const cleanupMedia = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    videoElsRef.current.forEach((v) => {
      try {
        v.pause();
        v.srcObject = null;
      } catch {
        // ignore
      }
    });
    videoElsRef.current = [];
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------
  // Start recording.
  // -------------------------------------------------------------
  const start = useCallback(async () => {
    try {
      setError("");

      if (typeof window.MediaRecorder === "undefined") {
        setError("Recording is not supported in this browser.");
        return;
      }

      const res = await initiateRecording(roomCode);
      const data = getApiData(res);
      if (!data?.recording_id) {
        throw new Error("Could not start recording.");
      }

      recordingIdRef.current = data.recording_id;
      partNumberRef.current = 1;
      uploadedPartsRef.current = [];
      bufferRef.current = [];
      bufferedSizeRef.current = 0;
      totalSizeRef.current = 0;
      uploadChainRef.current = Promise.resolve();
      startTimeRef.current = Date.now();

      const composite = buildCompositeStream();
      const mimeType = MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp8,opus"
      )
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const recorder = new MediaRecorder(composite, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          bufferRef.current.push(event.data);
          bufferedSizeRef.current += event.data.size;
          totalSizeRef.current += event.data.size;
          flushBuffer(false);
        }
      };

      recorder.start(3000); // emit a chunk every 3s
      setIsRecording(true);
    } catch (e) {
      setError(e?.message || "Unable to start recording.");
      cleanupMedia();
    }
  }, [roomCode, buildCompositeStream, flushBuffer, cleanupMedia]);

  // -------------------------------------------------------------
  // Stop recording, upload the last part, and finalize.
  // -------------------------------------------------------------
  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    setIsRecording(false);

    await new Promise((resolve) => {
      recorder.onstop = resolve;
      try {
        recorder.stop();
      } catch {
        resolve();
      }
    });
    recorderRef.current = null;
    cleanupMedia();

    await flushBuffer(true);
    await uploadChainRef.current;

    const recordingId = recordingIdRef.current;
    const durationSeconds = Math.round(
      (Date.now() - startTimeRef.current) / 1000
    );

    try {
      if (uploadedPartsRef.current.length === 0) {
        await abortRecording(roomCode, recordingId).catch(() => {});
        return;
      }
      await completeRecording(roomCode, recordingId, {
        parts: uploadedPartsRef.current,
        duration_seconds: durationSeconds,
        size_bytes: totalSizeRef.current,
      });
    } catch (e) {
      setError(e?.message || "Failed to finalize recording.");
      await abortRecording(roomCode, recordingId).catch(() => {});
    } finally {
      recordingIdRef.current = null;
    }
  }, [roomCode, flushBuffer, cleanupMedia]);

  return { isRecording, start, stop, error };
}
