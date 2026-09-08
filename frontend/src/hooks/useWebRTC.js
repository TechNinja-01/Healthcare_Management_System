import { useCallback, useEffect, useRef, useState } from "react";

import { getAccessToken } from "../api/apiClient";
import {
  buildConsultationWsUrl,
  getIceServers,
  getRoomMessages,
} from "../api/consultationApi";

/**
 * useWebRTC — 1-on-1 video/audio/chat over native WebRTC.
 *
 * The FastAPI WebSocket only relays signaling + chat; audio/video flow
 * peer-to-peer. One side (the newcomer who finds a peer already present)
 * is told `initiator: true` by the server and creates the SDP offer.
 *
 * Returns everything the call UI needs: media streams, connection state,
 * chat, and control handlers.
 */
export default function useWebRTC(roomCode) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState("initializing"); // initializing | waiting | connecting | connected | disconnected | error
  const [messages, setMessages] = useState([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [error, setError] = useState("");

  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const selfIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteDescSetRef = useRef(false);
  const closedRef = useRef(false);

  // ----------------------------------------------------------------
  // Send a JSON message over the signaling socket (if open).
  // ----------------------------------------------------------------
  const sendSignal = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  // ----------------------------------------------------------------
  // Flush ICE candidates that arrived before the remote description.
  // ----------------------------------------------------------------
  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore candidates that fail to add.
      }
    }
  }, []);

  // ----------------------------------------------------------------
  // Create the offer (only the designated initiator calls this).
  // ----------------------------------------------------------------
  const createOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ type: "offer", sdp: pc.localDescription });
    } catch (err) {
      setError("Failed to start the call: " + (err?.message || err));
    }
  }, [sendSignal]);

  // ----------------------------------------------------------------
  // Handle an inbound signaling message.
  // ----------------------------------------------------------------
  const handleSignal = useCallback(
    async (data) => {
      const pc = pcRef.current;
      if (!pc) return;

      switch (data.type) {
        case "joined": {
          selfIdRef.current = data.self_id;
          if (data.initiator) {
            setStatus("connecting");
            await createOffer();
          } else {
            setStatus("waiting");
          }
          break;
        }

        case "peer-joined": {
          // The other side just arrived; if we are the initiator side
          // this is handled via the "joined" frame instead.
          setStatus((s) => (s === "connected" ? s : "connecting"));
          break;
        }

        case "peer-left": {
          setRemoteStream(null);
          remoteDescSetRef.current = false;
          setStatus("waiting");
          break;
        }

        case "offer": {
          setStatus("connecting");
          await pc.setRemoteDescription(data.sdp);
          remoteDescSetRef.current = true;
          await flushPendingCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: "answer", sdp: pc.localDescription });
          break;
        }

        case "answer": {
          await pc.setRemoteDescription(data.sdp);
          remoteDescSetRef.current = true;
          await flushPendingCandidates();
          break;
        }

        case "ice-candidate": {
          if (!data.candidate) break;
          if (remoteDescSetRef.current) {
            try {
              await pc.addIceCandidate(data.candidate);
            } catch {
              // ignore
            }
          } else {
            pendingCandidatesRef.current.push(data.candidate);
          }
          break;
        }

        case "chat": {
          setMessages((prev) => [
            ...prev,
            {
              sender_user_id: data.sender_user_id,
              message: data.message,
              created_at: data.created_at,
              mine: data.sender_user_id === selfIdRef.current,
            },
          ]);
          break;
        }

        case "hangup": {
          setRemoteStream(null);
          setStatus("disconnected");
          break;
        }

        default:
          break;
      }
    },
    [createOffer, flushPendingCandidates, sendSignal]
  );

  // ----------------------------------------------------------------
  // Set up media, peer connection, and the signaling socket.
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!roomCode) return undefined;

    closedRef.current = false;
    let cancelled = false;

    const setup = async () => {
      try {
        setStatus("initializing");

        // 1. Load existing chat history.
        try {
          const res = await getRoomMessages(roomCode);
          const history = res?.data?.data || [];
          if (!cancelled) {
            setMessages(
              history.map((m) => ({
                sender_user_id: m.sender_user_id,
                message: m.message,
                created_at: m.created_at,
                mine: false,
              }))
            );
          }
        } catch {
          // Non-fatal — proceed without history.
        }

        // 2. Local camera + microphone.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        // 3. ICE servers (STUN/TURN) from the backend.
        let iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
        try {
          const iceRes = await getIceServers();
          const fetched = iceRes?.data?.data?.ice_servers;
          if (Array.isArray(fetched) && fetched.length) {
            iceServers = fetched;
          }
        } catch {
          // Fall back to the public STUN default.
        }

        // 4. Peer connection.
        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal({ type: "ice-candidate", candidate: event.candidate });
          }
        };

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          if (state === "connected") setStatus("connected");
          else if (state === "failed" || state === "closed")
            setStatus("disconnected");
        };

        // 5. Signaling WebSocket.
        const token = getAccessToken();
        const ws = new WebSocket(buildConsultationWsUrl(roomCode, token));
        wsRef.current = ws;

        ws.onmessage = (event) => {
          let data;
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          handleSignal(data);
        };

        ws.onclose = (event) => {
          if (closedRef.current) return;
          if (event.code === 4401) setError("Session expired. Please log in again.");
          else if (event.code === 4403) setError("You are not a participant of this consultation.");
          else if (event.code === 4404) setError("Consultation room not found.");
          else if (event.code === 4409) setError("This room is already full.");
          setStatus((s) => (s === "connected" ? "disconnected" : s));
        };

        ws.onerror = () => {
          if (!closedRef.current) {
            setError("Signaling connection error.");
          }
        };
      } catch (err) {
        if (err?.name === "NotAllowedError") {
          setError("Camera/microphone permission denied.");
        } else if (err?.name === "NotFoundError") {
          setError("No camera or microphone found.");
        } else {
          setError(err?.message || "Unable to start the consultation.");
        }
        setStatus("error");
      }
    };

    setup();

    // Cleanup on unmount / room change.
    return () => {
      cancelled = true;
      closedRef.current = true;

      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {
          // ignore
        }
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      remoteDescSetRef.current = false;
      pendingCandidatesRef.current = [];
    };
  }, [roomCode, handleSignal, sendSignal]);

  // ----------------------------------------------------------------
  // Controls.
  // ----------------------------------------------------------------
  const sendChat = useCallback(
    (text) => {
      const trimmed = (text || "").trim();
      if (!trimmed) return;
      sendSignal({ type: "chat", message: trimmed });
      setMessages((prev) => [
        ...prev,
        {
          sender_user_id: selfIdRef.current,
          message: trimmed,
          created_at: new Date().toISOString(),
          mine: true,
        },
      ]);
    },
    [sendSignal]
  );

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMicEnabled((prev) => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCameraEnabled((prev) => !prev);
  }, []);

  const hangUp = useCallback(() => {
    sendSignal({ type: "hangup" });
    closedRef.current = true;
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setStatus("disconnected");
  }, [sendSignal]);

  return {
    localStream,
    remoteStream,
    status,
    messages,
    micEnabled,
    cameraEnabled,
    error,
    sendChat,
    toggleMic,
    toggleCamera,
    hangUp,
  };
}
