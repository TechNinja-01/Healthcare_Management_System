import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getIncomingCalls } from "../api/consultationApi";
import { useAuth } from "../context/AuthContext";
import { getApiData } from "../utils/apiHelpers";

const POLL_INTERVAL_MS = 5000;

// Format "HH:MM:SS" as a local, readable time.
const formatTime = (timeString) => {
  if (!timeString) return "";
  const [hours, minutes] = timeString.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Global "incoming call" watcher for logged-in patients.
 *
 * Polls the backend for rooms where the doctor is already connected
 * and waiting; when one appears, shows a ringing modal with
 * Pick Up / Decline. Mounted once inside the router so it works on
 * every page except the call screen itself.
 */
export default function IncomingCallModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [call, setCall] = useState(null);

  // Rooms the patient declined; don't re-ring until the doctor
  // leaves and calls again (the room drops out of the poll result).
  const dismissedRef = useRef(new Set());
  const audioRef = useRef(null);

  const isPatient = user?.role === "patient";
  const inCall = location.pathname.startsWith("/consultation/");

  // ------------------------------------------------------------
  // Poll for incoming calls.
  // ------------------------------------------------------------
  useEffect(() => {
    if (!isPatient || inCall) {
      setCall(null);
      return undefined;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await getIncomingCalls();
        if (cancelled) return;

        const calls = getApiData(res) || [];
        const ringing = calls.map((c) => c.room_code);

        // A room no longer ringing can ring again later.
        dismissedRef.current.forEach((code) => {
          if (!ringing.includes(code)) {
            dismissedRef.current.delete(code);
          }
        });

        const next =
          calls.find(
            (c) => !dismissedRef.current.has(c.room_code)
          ) || null;

        setCall((prev) =>
          prev && next && prev.room_code === next.room_code
            ? prev
            : next
        );
      } catch {
        // Network hiccup — keep polling silently.
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isPatient, inCall]);

  // ------------------------------------------------------------
  // Ringtone (WebAudio, no asset needed). Best-effort: browsers may
  // block audio until the user interacts with the page.
  // ------------------------------------------------------------
  useEffect(() => {
    if (!call) return undefined;

    let ctx;
    let interval;

    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();

      const ring = () => {
        if (ctx.state !== "running") {
          ctx.resume().catch(() => {});
          return;
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + 0.8
        );
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      };

      ring();
      interval = setInterval(ring, 2000);
      audioRef.current = ctx;
    } catch {
      // No audio available — the visual modal is enough.
    }

    return () => {
      if (interval) clearInterval(interval);
      if (ctx) ctx.close().catch(() => {});
      audioRef.current = null;
    };
  }, [call]);

  if (!call) return null;

  const handlePickUp = () => {
    const roomCode = call.room_code;
    setCall(null);
    navigate(`/consultation/${roomCode}`);
  };

  const handleDecline = () => {
    dismissedRef.current.add(call.room_code);
    setCall(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        {/* Ringing avatar */}
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-40" />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
            📞
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-800">
          Incoming Video Call
        </h2>

        <p className="mt-1 text-gray-600">
          {call.doctor_name
            ? `Dr. ${call.doctor_name}`
            : "Your doctor"}{" "}
          is calling you
        </p>

        {call.appointment_time && (
          <p className="mt-1 text-sm text-gray-400">
            Appointment at {formatTime(call.appointment_time)}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handleDecline}
            className="rounded-full bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
          >
            Decline
          </button>
          <button
            onClick={handlePickUp}
            className="animate-pulse rounded-full bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
          >
            Pick Up
          </button>
        </div>
      </div>
    </div>
  );
}
