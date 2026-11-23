export function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      className="toggle"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
      <span>{label}</span>
    </button>
  );
}
