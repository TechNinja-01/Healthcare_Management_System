export default function Modal({ open, title, onClose, children, wide = false }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`rounded-xl w-full max-h-[90vh] overflow-y-auto ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none opacity-50 hover:opacity-100"
            style={{ color: "var(--color-text-secondary)" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
