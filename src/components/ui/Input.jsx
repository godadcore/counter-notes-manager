import { describedBy } from "./Field.jsx";

export function Input({ id, hint, error, ...props }) {
  return (
    <input
      id={id}
      className="input"
      aria-invalid={error ? "true" : undefined}
      aria-describedby={describedBy(id, hint, error)}
      {...props}
    />
  );
}
