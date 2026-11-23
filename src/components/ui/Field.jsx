export function Field({ id, label, hint, error, children }) {
  const hintId = hint ? id + "-hint" : undefined;
  const errorId = error ? id + "-error" : undefined;
  return (
    <div className="field">
      {label ? <label className="field-label" htmlFor={id}>{label}</label> : null}
      {children}
      {error ? <p className="field-error" id={errorId}>{error}</p> : null}
      {hint && !error ? <p className="field-hint" id={hintId}>{hint}</p> : null}
    </div>
  );
}

export function describedBy(id, hint, error) {
  return [error ? id + "-error" : "", hint && !error ? id + "-hint" : ""].filter(Boolean).join(" ") || undefined;
}
