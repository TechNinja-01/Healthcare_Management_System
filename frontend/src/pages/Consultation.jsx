import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getRecordingDownloadUrl,
  listRecordings,
} from "../api/consultationApi";
import { useAuth } from "../context/AuthContext";
import useCallRecorder from "../hooks/useCallRecorder";
import useWebRTC from "../hooks/useWebRTC";
import { getApiData } from "../utils/apiHelpers";

const STATUS_LABEL = {
  initializing: "Setting up your camera…",
  waiting: "Waiting for the other person to join…",
  connecting: "Connecting…",
  connected: "Connected",
  disconnected: "Call ended",
  error: "Something went wrong",
};

export default function Consultation() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
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
  } = useWebRTC(roomCode);

  const {
    isRecording,
    start: startRecording,
    stop: stopRecording,
    error: recordingError,
  } = useCallRecorder(roomCode, localStream, remoteStream);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);

  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [showRecordings, setShowRecordings] = useState(false);
  const [recordings, setRecordings] = useState([]);

  // Only the doctor is the designated recorder.
  const canRecord = user?.role === "doctor";

  // Attach streams to their <video> elements.
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-scroll chat to the newest message.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (event) => {
    event.preventDefault();
    if (!chatInput.trim()) return;
    sendChat(chatInput);
    setChatInput("");
  };

  const handleHangUp = async () => {
    if (isRecording) {
      await stopRecording();
    }
    hangUp();
    navigate("/appointments");
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }
    const consented = window.confirm(
      "This will record the audio, video, and start saving it securely. " +
        "The other participant will be notified. Continue?"
    );
    if (!consented) return;
    sendChat("🔴 The doctor has started recording this consultation.");
    await startRecording();
  };

  const openRecordings = async () => {
    const next = !showRecordings;
    setShowRecordings(next);
    if (next) {
      try {
        const res = await listRecordings(roomCode);
        setRecordings(getApiData(res) || []);
      } catch {
        setRecordings([]);
      }
    }
  };

  const handleDownload = async (recordingId) => {
    try {
      const res = await getRecordingDownloadUrl(recordingId);
      const url = getApiData(res)?.url;
      if (url) {
        window.open(url, "_blank", "noopener");
      }
    } catch {
      // ignore
    }
  };

  const isConnected = status === "connected";

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      {/* ---------------------------------------------------------- */}
      {/* Header */}
      {/* ---------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold">Online Consultation</h1>
          <p className="text-sm text-gray-400">
            {STATUS_LABEL[status] || status}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isRecording && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              REC
            </span>
          )}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isConnected
                ? "bg-green-500/20 text-green-300"
                : status === "disconnected" || status === "error"
                ? "bg-red-500/20 text-red-300"
                : "bg-yellow-500/20 text-yellow-300"
            }`}
          >
            {isConnected ? "● Live" : STATUS_LABEL[status] || status}
          </span>
        </div>
      </div>

      {(error || recordingError) && (
        <div className="bg-red-600/90 px-5 py-2 text-center text-sm">
          {error || recordingError}
        </div>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Body: video area + chat */}
      {/* ---------------------------------------------------------- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="relative flex flex-1 items-center justify-center bg-black">
          {/* Remote (main) video */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="text-center text-gray-400">
              <div className="mb-3 text-6xl">👤</div>
              <p>{STATUS_LABEL[status] || "Waiting…"}</p>
            </div>
          )}

          {/* Local (picture-in-picture) video */}
          <div className="absolute bottom-4 right-4 h-40 w-56 overflow-hidden rounded-lg border-2 border-gray-700 bg-gray-800 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {!cameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-sm text-gray-400">
                Camera off
              </div>
            )}
            <span className="absolute bottom-1 left-2 text-xs text-gray-300">
              You
            </span>
          </div>
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="flex w-80 flex-col border-l border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-4 py-3 font-medium">
              Chat
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <p className="text-center text-sm text-gray-500">
                  No messages yet.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      m.mine
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-100"
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="flex gap-2 border-t border-gray-800 p-3"
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-lg bg-gray-800 px-3 py-2 text-sm outline-none placeholder:text-gray-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-700"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Controls */}
      {/* ---------------------------------------------------------- */}
      <div className="flex items-center justify-center gap-4 border-t border-gray-800 py-4">
        <button
          onClick={toggleMic}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${
            micEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600"
          }`}
          title={micEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {micEnabled ? "🎤" : "🔇"}
        </button>

        <button
          onClick={toggleCamera}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${
            cameraEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600"
          }`}
          title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
        >
          {cameraEnabled ? "📹" : "🚫"}
        </button>

        <button
          onClick={() => setShowChat((s) => !s)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-xl hover:bg-gray-600"
          title="Toggle chat"
        >
          💬
        </button>

        {canRecord && (
          <button
            onClick={handleToggleRecord}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${
              isRecording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? "⏹️" : "⏺️"}
          </button>
        )}

        <button
          onClick={openRecordings}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-xl hover:bg-gray-600"
          title="Recordings"
        >
          🎞️
        </button>

        <button
          onClick={handleHangUp}
          className="flex h-12 w-16 items-center justify-center rounded-full bg-red-600 text-xl hover:bg-red-700"
          title="Leave call"
        >
          📞
        </button>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Recordings panel */}
      {/* ---------------------------------------------------------- */}
      {showRecordings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowRecordings(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-gray-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recordings</h3>
              <button
                onClick={() => setShowRecordings(false)}
                className="text-2xl text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            {recordings.length === 0 ? (
              <p className="text-center text-sm text-gray-400">
                No recordings yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {recordings.map((rec) => (
                  <li
                    key={rec.id}
                    className="flex items-center justify-between rounded-lg bg-gray-700 px-4 py-3"
                  >
                    <div className="text-sm">
                      <div className="font-medium">Recording #{rec.id}</div>
                      <div className="text-xs text-gray-400">
                        {rec.duration_seconds
                          ? `${rec.duration_seconds}s`
                          : "—"}
                        {rec.created_at
                          ? ` • ${new Date(
                              rec.created_at
                            ).toLocaleString("en-IN")}`
                          : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(rec.id)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-700"
                    >
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
