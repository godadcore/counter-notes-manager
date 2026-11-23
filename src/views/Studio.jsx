import { useState } from "react";
import { CopyBlock } from "../components/CopyBlock.jsx";
import { HoldList } from "../components/HoldList.jsx";
import { Badge, Chip } from "../components/ui/Badge.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Checkbox } from "../components/ui/Checkbox.jsx";
import { Expander } from "../components/ui/Expander.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Select } from "../components/ui/Select.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { STATUS_OPTIONS, VIDEOS } from "../data.js";
import { isUnverified } from "../status.js";
import { auditItems, auditPromptText, ideasPromptText, thumbConcepts, thumbPromptText } from "../prompts.js";

export function Studio({ topics, findings, setStatus, setFindingUrl, factChecks, setFactCheck, cadence, studioId, setStudioId, logEvent }) {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const video = VIDEOS.find((item) => item.id === Number(studioId)) || VIDEOS[0];
  const topic = topics.find((item) => item.id === video.id);
  const status = topic?.status || "queued";
  const topicFindings = findings.filter((item) => item.topicId === video.id);
  const holds = topicFindings.filter((item) => item.hold).length;
  const items = auditItems(video);

  async function changeStatus(next) {
    try {
      await setStatus(video.id, next);
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <div className="page">
      <SectionHeader title="Studio" lede="Status, thumbnails, and the fact audit for one video. Ready to Post stays locked while a number needs a check." />
      <Card>
        <Select
          id="studio-video"
          label="Video"
          value={String(video.id)}
          onChange={(value) => setStudioId(Number(value))}
          options={VIDEOS.map((item) => ({ value: String(item.id), label: item.short }))}
        />
        <p className="picker-title">{video.title}</p>
        <Select
          id="studio-status"
          label="Status"
          value={status}
          hint={holds ? holds + (holds === 1 ? " number needs a check. Add an evidence link before Ready to Post." : " numbers need a check. Add an evidence link before Ready to Post.") : "Every number is verified."}
          onChange={changeStatus}
          options={STATUS_OPTIONS.map((item) => ({ value: item.id, label: item.label }))}
        />
        {isUnverified(status, topicFindings) ? <p><Badge status="unverified">Needs check</Badge> Posted or ready, and a number still needs a check.</p> : null}
      </Card>
      <Expander title={"Needs check (" + holds + ")"}>
        <HoldList findings={topicFindings} onSave={setFindingUrl} />
      </Expander>
      <Expander title="All 30 videos">
        <div className="kit-row">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
          {STATUS_OPTIONS.map((item) => (
            <Chip key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</Chip>
          ))}
        </div>
        {VIDEOS.filter((item) => filter === "all" || (topics.find((row) => row.id === item.id)?.status || "queued") === filter).map((item) => {
          const row = topics.find((topicRow) => topicRow.id === item.id);
          return (
            <div className="list-row" key={item.id}>
              <span>{item.short}</span>
              <span>
                <Badge status={row?.status || "queued"} />
                {isUnverified(row?.status, findings.filter((finding) => finding.topicId === item.id)) ? <Badge status="unverified">Needs check</Badge> : null}
              </span>
            </div>
          );
        })}
        <CopyBlock text={ideasPromptText((id) => topics.find((item) => item.id === id)?.status || "queued", cadence)} label="Copy 30-idea prompt" onCopied={logEvent} variant="secondary" tall />
      </Expander>
      <Expander title="Thumbnail prompts">
        {thumbConcepts(video).map((concept) => (
          <div key={concept.name}>
            <p><strong>{concept.name}: {concept.text}</strong></p>
            <CopyBlock text={thumbPromptText(video, concept)} label="Copy thumbnail prompt" topicId={video.id} onCopied={logEvent} variant="secondary" />
          </div>
        ))}
      </Expander>
      <Expander title="Fact audit">
        {items.map((item) => (
          <Checkbox
            key={item.key}
            checked={!!factChecks[video.id + ":" + item.key]}
            label={item.label}
            onChange={(checked) => setFactCheck(video.id, item.key, checked)}
          />
        ))}
        <CopyBlock text={auditPromptText(video, factChecks)} label="Copy fact-audit prompt" topicId={video.id} onCopied={logEvent} variant="secondary" tall />
      </Expander>
    </div>
  );
}
