import { useRef } from "react";
import { Button } from "./ui/Button.jsx";
import { useToast } from "./ui/Toast.jsx";
import { copy } from "../copy.js";

export async function writeClipboard(text) {
  try {
    const write = navigator.clipboard?.writeText(text) || Promise.reject(new Error("no clipboard"));
    const timeout = new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("clipboard timeout")), 800);
    });
    await Promise.race([write, timeout]);
    return;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "0";
    area.style.top = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } finally {
      area.remove();
    }
    if (!ok) throw new Error("copy failed");
  }
}

export function CopyBlock({ text, label, topicId = null, onCopied, tall = false, variant = "primary", disabled = false }) {
  const toast = useToast();
  const boxRef = useRef(null);

  async function copy() {
    if (disabled) return;
    try {
      await writeClipboard(text);
      toast(copy.toast.copied);
      onCopied?.({ action: "copy", topicId, detail: label });
    } catch {
      const node = boxRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
      toast(copy.toast.copyFailed);
    }
  }

  return (
    <div className="stack-gap">
      <pre ref={boxRef} className={tall ? "copy-box scroll-panel tall" : "copy-box scroll-panel"}>{text}</pre>
      <Button variant={variant} onClick={copy} disabled={disabled}>{label}</Button>
    </div>
  );
}
