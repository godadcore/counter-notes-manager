import { Button } from "./Button.jsx";
import { copy } from "../../copy.js";

const LABELS = copy.status;

export function Badge({ status, children }) {
  const text = children || LABELS[status] || status;
  return <span className={status ? `badge badge-${status}` : "badge"}>{text}</span>;
}

export function Chip({ active = false, children, ...props }) {
  return (
    <Button variant="chip" className={active ? "active" : ""} {...props}>
      {children}
    </Button>
  );
}
