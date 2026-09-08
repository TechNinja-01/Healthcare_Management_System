export default function Button({
  children,
  type = "button",
  variant = "primary",
  disabled = false,
  onClick,
  className = "",
}) {
  const variantClass =
    variant === "primary"
      ? "btn btn-primary"
      : variant === "secondary"
        ? "btn btn-secondary"
        : variant === "danger"
          ? "btn btn-danger"
          : variant === "ghost"
            ? "btn btn-ghost"
            : variant === "ghost-danger"
              ? "btn btn-ghost-danger"
              : "btn btn-primary";

  return (
    <button
      type={type}
      className={`${variantClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
