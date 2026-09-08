export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
  placeholder = "",
  min,
  max,
  options = null,
  disabled = false,
}) {
  const labelClass = required ? "form-label form-label-required" : "form-label";

  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      {options ? (
        <select
          // id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className="form-input"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          // id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          min={min}
          max={max}
          disabled={disabled}
          className="form-input"
        />
      )}
    </div>
  );
}
