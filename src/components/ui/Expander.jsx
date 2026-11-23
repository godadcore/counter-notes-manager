import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "./Button.jsx";

export function Expander({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className="expander">
      <Button variant="ghost" className="expander-trigger" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        <ChevronDown size={18} />
      </Button>
      {open ? <div className="expander-panel" id={panelId}>{children}</div> : null}
    </div>
  );
}
