import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { describedBy } from "./Field.jsx";
import { Button } from "./Button.jsx";
import { lockPageScroll } from "../../scrollLock.js";
import { copy } from "../../copy.js";

export function Select({ id, label, hint, error, value, onChange, options, disabled = false, sheetTitle, hideLabel = false }) {
  const reactId = useId();
  const controlId = id || reactId;
  const listId = controlId + "-list";
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [sheet, setSheet] = useState(() => window.matchMedia("(max-width: 899px)").matches);
  const [box, setBox] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const selected = options.findIndex((option) => String(option.value) === String(value));
  const current = options[selected] || options[0];

  useEffect(() => {
    const media = window.matchMedia("(max-width: 899px)");
    const apply = () => setSheet(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(88, Math.floor(openUp ? spaceAbove : spaceBelow));
    const top = openUp ? Math.max(gap, rect.top - gap - maxHeight) : rect.bottom + gap;
    const width = rect.width;
    const left = Math.max(0, Math.min(rect.left, window.innerWidth - width));
    setBox({ top, left, width, maxHeight, placement: openUp ? "up" : "down" });
  }

  useEffect(() => {
    if (!open) return undefined;
    const unlock = lockPageScroll();
    function onDoc(event) {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      if (target.closest?.("[data-select-popover]")) return;
      setOpen(false);
    }
    function onResize() {
      if (!sheet) place();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onResize);
    return () => {
      unlock();
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onResize);
      buttonRef.current?.focus();
    };
  }, [open, sheet]);

  function choose(option) {
    onChange(option.value);
    setOpen(false);
  }

  function onKey(event) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActive(Math.max(selected, 0));
        if (!sheet) place();
        setOpen(true);
        return;
      }
      setActive((index) => {
        const step = event.key === "ArrowDown" ? 1 : -1;
        return (index + step + options.length) % options.length;
      });
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setActive(Math.max(selected, 0));
        if (!sheet) place();
        setOpen(true);
      } else if (options[active]) {
        choose(options[active]);
      }
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const list = (
    <ul
      id={listId}
      className="select-list"
      data-scroll-lock-list="true"
      role="listbox"
      aria-label={label || copy.choose}
      style={!sheet && box ? { maxHeight: box.maxHeight } : undefined}
    >
      {options.map((option, index) => {
        const on = String(option.value) === String(value);
        return (
          <li key={option.value}>
            <Button
              variant="option"
              role="option"
              id={controlId + "-opt-" + index}
              className={index === active ? "is-active" : ""}
              aria-selected={on}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {on ? <Check className="option-check" size={16} aria-hidden="true" /> : null}
            </Button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="field" ref={rootRef}>
      {label && !hideLabel ? <label className="field-label" htmlFor={controlId}>{label}</label> : null}
      <div className="select">
        <Button
          variant="select"
          ref={buttonRef}
          id={controlId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? controlId + "-opt-" + active : undefined}
          aria-label={label || copy.choose}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy(controlId, hint, error)}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setActive(Math.max(selected, 0));
            if (!sheet) place();
            setOpen((valueOpen) => !valueOpen);
          }}
          onKeyDown={onKey}
        >
          <span>{current ? (current.trigger || current.label) : copy.choose}</span>
          <ChevronDown size={18} />
        </Button>
      </div>
      {error ? <p className="field-error" id={controlId + "-error"}>{error}</p> : null}
      {hint && !error ? <p className="field-hint" id={controlId + "-hint"}>{hint}</p> : null}
      {open && sheet ? createPortal(
        <>
          <div className="select-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="select-sheet" data-select-popover="true" data-placement="sheet">
            <div className="sheet-bar">
              <h2>{sheetTitle || label || copy.choose}</h2>
              <Button variant="icon" aria-label={copy.close} onClick={() => setOpen(false)}><X size={18} /></Button>
            </div>
            {list}
          </div>
        </>,
        document.body
      ) : null}
      {open && !sheet && box ? createPortal(
        <div
          className="select-popover"
          data-select-popover="true"
          data-placement={box.placement}
          style={{ top: box.top, left: box.left, width: box.width }}
        >
          {list}
        </div>,
        document.body
      ) : null}
    </div>
  );
}
