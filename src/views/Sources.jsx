import { useState } from "react";
import { Button } from "../components/ui/Button.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Chip } from "../components/ui/Badge.jsx";
import { Input } from "../components/ui/Input.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { PLAN } from "../data.js";
import { copy } from "../copy.js";
import { claimFindings, isUnverified, nextPostTopicIds } from "../status.js";

function todayStamp() {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}

function siteName(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function readyLink(value) {
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
}

export function Sources({ topics, findings, days, reviewFinding, checkLink }) {
  const toast = useToast();
  const [filter, setFilter] = useState("next");
  const nextIds = nextPostTopicIds(PLAN, days, 4);
  const visible = filter === "next"
    ? nextIds.map((id) => topics.find((topic) => topic.id === id)).filter(Boolean)
    : topics.filter((topic) => claimFindings(findings).some((item) => item.topicId === topic.id && item.hold));

  return (
    <div className="page">
      <SectionHeader title={copy.proof.title} lede={copy.proof.lede} />
      <div className="kit-row">
        <Chip active={filter === "next"} onClick={() => setFilter("next")}>{copy.proof.next}</Chip>
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>{copy.proof.all}</Chip>
      </div>
      {visible.length === 0 ? <p className="muted">{copy.proof.empty}</p> : null}
      {visible.map((topic) => {
        const rows = claimFindings(findings).filter((item) => item.topicId === topic.id && item.hold);
        return (
          <section className="proof-topic" key={topic.id}>
            <h2>{topic.short} <Badge status={topic.status} /> {isUnverified(topic.status, findings.filter((item) => item.topicId === topic.id)) ? <Badge status="unverified">{copy.status.unverified}</Badge> : null}</h2>
            <p className="muted">{rows.length === 0 ? copy.proof.clear : copy.proof.need(rows.length)}</p>
            {rows.length === 0 ? <p className="muted">{copy.proof.nothing}</p> : null}
            {rows.length ? (
              <div className="proof-list">
                {rows.map((item) => (
                  <SourceRow key={item.id} item={item} onReview={reviewFinding} checkLink={checkLink} toast={toast} />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function SourceRow({ item, onReview, checkLink, toast }) {
  const [sourceUrl, setSourceUrl] = useState(item.sourceUrl || "");
  const [checked, setChecked] = useState(Boolean(item.sourceName || item.sourceDate));
  const name = siteName(sourceUrl.trim()) || item.sourceName || "";
  const date = todayStamp();
  const showSource = checked && name;

  async function check() {
    try {
      await checkLink(item.id, sourceUrl.trim());
      toast(copy.toast.confirmed);
    } catch (error) {
      toast(error.message);
    } finally {
      setChecked(true);
    }
  }

  async function send(accept) {
    try {
      await onReview(item.id, { sourceUrl: sourceUrl.trim(), sourceName: name, sourceDate: date, accept });
      toast(accept ? copy.toast.confirmed : copy.toast.stillCheck);
      if (!accept) setChecked(true);
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <article className="proof-card">
      <h3>{item.numberText}</h3>
      <p className="proof-claim">{item.label}</p>
      <div className="proof-link-row">
        <Input
          id={"url-" + item.id}
          value={sourceUrl}
          placeholder={copy.proof.paste}
          aria-label={copy.proof.paste}
          onChange={(event) => setSourceUrl(event.target.value)}
        />
        <Button variant="secondary" onClick={check}>{copy.proof.checkLink}</Button>
      </div>
      {showSource ? <p className="proof-meta">{copy.proof.sourceLine(name, date)}</p> : null}
      <div className="proof-actions">
        <Button onClick={() => send(true)} disabled={!readyLink(sourceUrl)}>{copy.proof.confirm}</Button>
        <Button variant="ghost" onClick={() => send(false)}>{copy.proof.leave}</Button>
      </div>
    </article>
  );
}
