import { Button } from "./Button.jsx";

export function IconButton({ label, children, className = "", ...props }) {
  return (
    <Button variant="icon" className={className} aria-label={label} {...props}>
      {children}
    </Button>
  );
}
