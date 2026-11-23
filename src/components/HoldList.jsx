import { useState } from "react";
import { Button } from "./ui/Button.jsx";
import { Field } from "./ui/Field.jsx";
import { Input } from "./ui/Input.jsx";
import { useToast } from "./ui/Toast.jsx";
import { claimFindings } from "../status.js";
import { copy } from "../copy.js";

export function HoldList({ findings, onSave }) {
  const holds = claimFindings(findings).filter((item) => item.hold);
  const toast = useToast();
  if (!holds.length) return <p className="muted">{copy.today.allConfirmed}</p>;
  return (
    <div>
      {holds.map((item) => (
        <HoldRow key={item.id} item={item} onSave={onSave} toast={toast} />
      ))}
    </div>
  );
}

function HoldRow({ item, onSave, toast }) {
  const [url, setUrl] = useState(item.sourceUrl || "");
  const id = "hold-" + item.id;
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await onSave(item.id, url.trim());
          toast(copy.toast.proofSaved);
        } catch (error) {
          toast(error.message);
        }
      }}
    >
      <Field id={id} label={item.numberText} hint={item.label}>
        <Input id={id} value={url} placeholder={copy.today.linkPlaceholder} onChange={(event) => setUrl(event.target.value)} />
      </Field>
      <Button type="submit" variant="secondary">{copy.today.saveProof}</Button>
    </form>
  );
}
