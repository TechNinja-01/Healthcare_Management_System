export default function FormSection({ title, children }) {
  return (
    <div className="mb-6">
      {title && <h3 className="section-heading">{title}</h3>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}
