import { describedBy } from "./Field.jsx";

export function Textarea({ id, hint, error, ...props }) {
  return (
    <textarea
      id={id}
      className="textarea"
      aria-invalid={error ? "true" : undefined}
      aria-describedby={describedBy(id, hint, error)}
      {...props}
    />
  );
}
