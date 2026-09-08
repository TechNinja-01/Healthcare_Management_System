export default function Alert({ type = "error", message, onClose }) {
  if (!message) {
    return null;
  }

  const alertClass = type === "success" ? "alert alert-success" : "alert alert-error";

  return (
    <div className={`${alertClass} flex justify-between gap-4`}>
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="font-bold shrink-0 opacity-70 hover:opacity-100">
          ×
        </button>
      )}
    </div>
  );
}
