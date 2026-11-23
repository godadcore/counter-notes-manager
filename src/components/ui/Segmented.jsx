import { Button } from "./Button.jsx";

export function Segmented({ label, value, onChange, options, disabled = false }) {
  function move(index, direction) {
    const next = options[(index + direction + options.length) % options.length];
    onChange(next.value);
  }

  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <Button
            key={option.value}
            variant="secondary"
            role="radio"
            className="segmented-item"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1);
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1);
              }
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
