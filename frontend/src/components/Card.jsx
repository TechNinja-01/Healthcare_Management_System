export default function Card({ title, value, subtitle }) {
  return (
    <div className="card text-left">
      <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
        {title}
      </p>
      <h2 className="text-2xl font-bold mt-2" style={{ color: "var(--color-text)" }}>
        {value}
      </h2>
      {subtitle && (
        <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
