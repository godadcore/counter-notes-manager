import { useState } from "react";
import { CopyBlock } from "./CopyBlock.jsx";
import { Badge } from "./ui/Badge.jsx";
import { Button } from "./ui/Button.jsx";
import { Expander } from "./ui/Expander.jsx";
import { Field } from "./ui/Field.jsx";
import { Input } from "./ui/Input.jsx";
import { Segmented } from "./ui/Segmented.jsx";
import { useToast } from "./ui/Toast.jsx";
import { buildScenePrompt, scorecard } from "../engine/videoPrompt.js";
import { copy } from "../copy.js";

export function VideoPrompt({ topic, findings, part, parts, settings, saveSettings, logEvent, topicId, dossier }) {
  const toast = useToast();
  const [toolName, setToolName] = useState(settings?.toolName || "generic");
  const [maxClip, setMaxClip] = useState(String(settings?.maxClipSeconds || 8));
  const [detail, setDetail] = useState(settings?.detail === "high" ? "high" : "normal");
  const doc = buildScenePrompt(topic, findings, {
    toolName: toolName.trim() || "generic",
    maxClipSeconds: Number(maxClip) || 8,
    detail,
    part,
    parts,
    dossier
  });
  const card = scorecard(doc);
  const checks = doc.locked ? card.checks.filter((check) => check.id === "source") : card.checks;

  async function save() {
    try {
      await saveSettings({ toolName, maxClipSeconds: Number(maxClip), detail });
      toast(copy.toast.videoSettings);
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <>
      <Field id="tool-name" label={copy.today.tool} hint={copy.today.toolHint}>
        <Input id="tool-name" value={toolName} onChange={(event) => setToolName(event.target.value)} />
      </Field>
      <Field id="max-clip" label={copy.today.maxClip}>
        <Input id="max-clip" value={maxClip} inputMode="numeric" onChange={(event) => setMaxClip(event.target.value)} />
      </Field>
      <Segmented
        label={copy.today.detail}
        value={detail}
        onChange={setDetail}
        options={[{ value: "normal", label: copy.today.normal }, { value: "high", label: copy.today.high }]}
      />
      <Button variant="secondary" onClick={save}>{copy.today.saveSettings}</Button>
      <div className="stack-gap">
        {checks.map((check) => (
          <p key={check.id}>
            <Badge status={check.pass ? "ready" : "unverified"}>{check.pass ? copy.today.pass : copy.today.fail}</Badge> {copy.quality[check.id] || check.label}
          </p>
        ))}
      </div>
      {doc.locked ? (
        <>
          <p className="muted">{copy.today.videoLockedBody}</p>
          <Button disabled>{copy.today.copyVideo}</Button>
        </>
      ) : (
        <>
          <CopyBlock text={doc.text} label={copy.today.copyVideo} topicId={topicId} onCopied={logEvent} tall />
          {doc.shots.map((shot) => (
            <Expander key={shot.index} title={copy.today.shot(shot.index, shot.start, shot.end)}>
              <CopyBlock text={shot.text} label={copy.today.copyShot(shot.index)} topicId={topicId} onCopied={logEvent} variant="secondary" />
            </Expander>
          ))}
        </>
      )}
    </>
  );
}
