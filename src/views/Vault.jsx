import { CopyBlock } from "../components/CopyBlock.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Expander } from "../components/ui/Expander.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Select } from "../components/ui/Select.jsx";
import { CHANNEL_DESC, CHANNEL_TAGS, VIDEOS } from "../data.js";
import { adsenseSnippet, cssSnippet, humanizerMasterText, ideasPromptText, masterPromptText, statusSnippet, thumbPromptText, videoDescription, videoTags } from "../prompts.js";

export function Vault({ topics, cadence, vaultId, setVaultId, logEvent }) {
  const video = VIDEOS.find((item) => item.id === Number(vaultId)) || VIDEOS[0];
  const statusOf = (id) => topics.find((item) => item.id === id)?.status || "queued";

  return (
    <div className="page">
      <SectionHeader title="Vault" lede="Copy the master prompt. The other packs are inside the sections below." />
      <Card>
        <CopyBlock text={masterPromptText(cadence)} label="Copy master prompt" onCopied={logEvent} tall />
      </Card>
      <Expander title="Humanizer prompt">
        <CopyBlock text={humanizerMasterText(cadence)} label="Copy humanizer prompt" onCopied={logEvent} variant="secondary" tall />
      </Expander>
      <Expander title="30-idea prompt">
        <CopyBlock text={ideasPromptText(statusOf, cadence)} label="Copy 30-idea prompt" onCopied={logEvent} variant="secondary" tall />
      </Expander>
      <Expander title="Thumbnail character prompt">
        <CopyBlock text={thumbPromptText(VIDEOS[0], { text: "SHORT TEXT", action: "standing beside one bold chart, price tag aimed at the number" })} label="Copy thumbnail prompt" onCopied={logEvent} variant="secondary" />
      </Expander>
      <Expander title="Channel description and tags">
        <CopyBlock text={CHANNEL_DESC} label="Copy channel description" onCopied={logEvent} variant="secondary" />
        <CopyBlock text={CHANNEL_TAGS} label="Copy channel tags" onCopied={logEvent} variant="secondary" />
      </Expander>
      <Expander title="Per-video SEO">
        <Select
          id="vault-video"
          label="Video"
          value={String(video.id)}
          onChange={(value) => setVaultId(Number(value))}
          options={VIDEOS.map((item) => ({ value: String(item.id), label: item.short }))}
        />
        <p className="picker-title">{video.title}</p>
        <CopyBlock text={videoDescription(video)} label="Copy video description" topicId={video.id} onCopied={logEvent} variant="secondary" tall />
        <CopyBlock text={videoTags(video)} label="Copy video tags" topicId={video.id} onCopied={logEvent} variant="secondary" />
      </Expander>
      <Expander title="Snippets">
        <CopyBlock text={cssSnippet()} label="Copy CSS tokens" onCopied={logEvent} variant="secondary" />
        <p className="muted">Monthly AdSense is an estimate: views, times videos, times CPM, divided by 1,000.</p>
        <CopyBlock text={adsenseSnippet(cadence)} label="Copy formula" onCopied={logEvent} variant="secondary" />
        <CopyBlock text={statusSnippet()} label="Copy status snippet" onCopied={logEvent} variant="secondary" />
      </Expander>
    </div>
  );
}
