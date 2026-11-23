import { Check } from "lucide-react";
import { Button } from "./Button.jsx";

export function Checkbox({ checked, onChange, label, disabled = false, done = false }) {
  return (
    <Button
      variant="ghost"
      role="checkbox"
      className={done && checked ? "check is-done" : "check"}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="check-box" aria-hidden="true">{checked ? <Check size={14} /> : null}</span>
      <span className="check-copy">{label}</span>
    </Button>
  );
}
