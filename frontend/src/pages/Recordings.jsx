import { useEffect, useState } from "react";

import {
  getMyRecordings,
  getRecordingDownloadUrl,
} from "../api/consultationApi";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layout/DashboardLayout";
import { getApiData, getErrorMessage } from "../utils/apiHelpers";

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Recordings() {
  const { user } = useAuth();

  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Recording currently playing: { recording, url }
  const [playing, setPlaying] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const isDoctor = user?.role === "doctor";

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getMyRecordings();
      setRecordings(getApiData(res) || []);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to fetch recordings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  // Fetch a fresh presigned URL, then play inline or download.
  const resolveUrl = async (recording) => {
    const res = await getRecordingDownloadUrl(recording.id);
    return getApiData(res)?.url;
  };

  const handlePlay = async (recording) => {
    try {
      setLoadingId(recording.id);
      const url = await resolveUrl(recording);
      if (url) setPlaying({ recording, url });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to play the recording"));
    } finally {
      setLoadingId(null);
    }
  };

  const handleDownload = async (recording) => {
    try {
      setLoadingId(recording.id);
      const url = await resolveUrl(recording);
      if (url) window.open(url, "_blank", "noopener");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to download the recording"));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Consultation Recordings"
        subtitle="Watch or download recordings of your online consultations"
      />

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-gray-600">Loading recordings...</p>
        </div>
      )}

      {!loading && !error && recordings.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <div className="mb-3 text-5xl">🎞️</div>
          <h2 className="text-xl font-semibold text-gray-800">
            No recordings yet
          </h2>
          <p className="mt-2 text-gray-500">
            Recordings of your online consultations will appear here.
          </p>
        </div>
      )}

      {!loading && recordings.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  {isDoctor ? "Patient" : "Doctor"}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Recorded on
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Duration
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Size
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {recordings.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">
                      {(isDoctor
                        ? rec.patient_name
                        : rec.doctor_name) || "—"}
                    </div>
                    <div className="text-sm text-gray-500">
                      Appointment #{rec.appointment_id}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {formatDate(rec.created_at)}
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {formatDuration(rec.duration_seconds)}
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {formatSize(rec.size_bytes)}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePlay(rec)}
                        disabled={loadingId === rec.id}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        ▶ Play
                      </button>
                      <button
                        onClick={() => handleDownload(rec)}
                        disabled={loadingId === rec.id}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        ⬇ Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Playback modal */}
      {playing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPlaying(null)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-gray-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between text-white">
              <h3 className="font-semibold">
                Recording #{playing.recording.id} •{" "}
                {formatDate(playing.recording.created_at)}
              </h3>
              <button
                onClick={() => setPlaying(null)}
                className="text-2xl text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <video
              src={playing.url}
              controls
              autoPlay
              className="max-h-[70vh] w-full rounded-lg bg-black"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
