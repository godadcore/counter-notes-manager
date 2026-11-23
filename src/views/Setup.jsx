import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Field } from "../components/ui/Field.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Textarea } from "../components/ui/Textarea.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { SEED_KEYWORDS } from "../data.js";
import { copy } from "../copy.js";

function linesOf(value) {
  return String(value || "").split(/\n+/).map((item) => item.trim()).filter(Boolean);
}

function channelParts(line) {
  const text = String(line || "").trim();
  const split = text.split("|");
  if (split.length < 2) return { name: text, id: "" };
  return { name: split[0].trim(), id: split.slice(1).join("|").trim() };
}

export function Setup({ niche, saveNiche }) {
  const toast = useToast();
  const savedKey = JSON.stringify(niche || {});
  const [keywords, setKeywords] = useState("");
  const [channels, setChannels] = useState("");
  const [loaded, setLoaded] = useState("");

  useEffect(() => {
    if (savedKey === loaded) return;
    const parsed = JSON.parse(savedKey);
    setKeywords((parsed.keywords || []).join("\n"));
    setChannels((parsed.channels || []).join("\n"));
    setLoaded(savedKey);
  }, [savedKey, loaded]);

  async function save() {
    try {
      await saveNiche({ keywords: linesOf(keywords), channels: linesOf(channels) });
      toast(copy.toast.nicheSaved);
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <div className="page">
      <SectionHeader title={copy.setup.title} lede={copy.setup.lede} />
      <Card>
        <Field id="niche-keywords" label={copy.setup.keywords} hint={copy.setup.keywordsHint + " " + SEED_KEYWORDS.join(", ") + "."}>
          <Textarea id="niche-keywords" value={keywords} onChange={(event) => setKeywords(event.target.value)} />
        </Field>
        <Field id="niche-channels" label={copy.setup.channels} hint={copy.setup.channelsHint}>
          <Textarea id="niche-channels" value={channels} onChange={(event) => setChannels(event.target.value)} />
        </Field>
        {linesOf(channels).map((line) => {
          const parts = channelParts(line);
          return (
            <p key={line} className="muted" data-channel-id={parts.id || "missing"}>
              {parts.id ? copy.setup.channelId(parts.name, parts.id) : copy.setup.channelIdMissing(parts.name)}
            </p>
          );
        })}
        <Button onClick={save}>{copy.setup.save}</Button>
      </Card>
    </div>
  );
}
