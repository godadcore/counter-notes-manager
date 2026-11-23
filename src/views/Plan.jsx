import { useState } from "react";
import { Button } from "../components/ui/Button.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Checkbox } from "../components/ui/Checkbox.jsx";
import { Expander } from "../components/ui/Expander.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Select } from "../components/ui/Select.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { PLAN, VIDEOS, WEEKS } from "../data.js";
import { isUnverified } from "../status.js";
import { WeeklyReview } from "./WeeklyReview.jsx";
import { copy } from "../copy.js";

function videoById(id) {
  return VIDEOS.find((video) => video.id === Number(id));
}

export function Plan({ days, setDay, topics, findings, series, performance, videoSettings, setStatus, splitTopic, savePerformance, openPart, openStudio }) {
  const toast = useToast();
  const [splitId, setSplitId] = useState(String((topics[0] && topics[0].id) || 4));
  const doneDays = PLAN.filter((item) => days[item.day] || days[String(item.day)]).length;
  const next = PLAN.find((item) => item.postId && !days[item.day] && !days[String(item.day)]) || null;
  const open = PLAN.find((item) => !days[item.day] && !days[String(item.day)]) || null;
  const openWeek = open ? open.week : 1;

  async function markPosted(id, short) {
    try {
      await setStatus(id, "posted");
      toast(copy.plan.marked(short));
    } catch (error) {
      toast(error.message);
    }
  }

  async function runSplit() {
    try {
      await splitTopic(Number(splitId));
      toast(copy.toast.splitSaved);
    } catch (error) {
      toast(error.message);
    }
  }

  const chosen = (series || []).find((item) => item.topicId === Number(splitId));

  return (
    <div className="page">
      <SectionHeader title={copy.plan.title} lede={copy.plan.lede} />
      <Card>
        {!next ? <p>{copy.plan.done}</p> : (
          <>
            <p><strong>{copy.today.day(next.day)}: {videoById(next.postId).title}</strong></p>
            {isUnverified(topics.find((topic) => topic.id === next.postId)?.status, findings.filter((item) => item.topicId === next.postId)) ? <Badge status="unverified">{copy.status.unverified}</Badge> : null}
            <p className="muted">{copy.plan.thumb(videoById(next.postId).thumb)}</p>
            {open && open.day < next.day ? <p className="muted">{copy.plan.finishFirst(open.day, open.title)}</p> : null}
            <Button onClick={() => openStudio(next.postId)}>{copy.plan.openToday}</Button>
          </>
        )}
        <p className="muted">{copy.plan.doneDays(doneDays)}</p>
        <div className="progress"><span style={{ width: Math.round((doneDays / PLAN.length) * 100) + "%" }} /></div>
      </Card>
      <Card>
        <h2>{copy.plan.splitter}</h2>
        <p className="muted">{copy.plan.splitterHelp}</p>
        <Select
          id="split-topic"
          label={copy.plan.topic}
          value={splitId}
          onChange={setSplitId}
          options={topics.map((topic) => ({ value: String(topic.id), label: topic.short + ". " + topic.title }))}
        />
        <Button onClick={runSplit}>{copy.plan.split}</Button>
        {chosen ? (
          <div className="stack-gap">
            <p><strong>{chosen.decision === "series" ? copy.plan.series : copy.plan.oneVideo}</strong></p>
            <p className="muted">{chosen.because}</p>
            {chosen.parts.map((part) => (
              <div className="stack-gap" key={part.index}>
                <p><strong>{copy.plan.partLine(part, chosen.cadence)}</strong></p>
                <p>{part.hook}</p>
                <p className="muted">{part.keyPoints.join(" ")}</p>
                <p className="muted">{part.cliffhanger}</p>
                <Button variant="secondary" onClick={() => openPart(chosen.topicId, part.index)}>{copy.plan.openPart}</Button>
              </div>
            ))}
          </div>
        ) : <p className="muted">{copy.plan.noSplit}</p>}
      </Card>
      <WeeklyReview topics={topics} performance={performance || []} maxClipSeconds={videoSettings?.maxClipSeconds || 8} savePerformance={savePerformance} />
      {WEEKS.map((week) => {
        const posts = PLAN.filter((item) => item.week === week.id && item.postId && (days[item.day] || days[String(item.day)])).length;
        return (
        <Expander key={week.id} title={copy.plan.weekTitle(week, posts, week.target)} defaultOpen={week.id === openWeek}>
          {PLAN.filter((item) => item.week === week.id).map((item) => {
            const on = !!(days[item.day] || days[String(item.day)]);
            const video = item.postId ? videoById(item.postId) : null;
            const posted = video && topics.find((topic) => topic.id === video.id)?.status === "posted";
            return (
              <div className="stack-gap" key={item.day}>
                <Checkbox checked={on} done={on} label={copy.plan.dayLine(item)} onChange={(checked) => setDay(item.day, checked)} />
                {video ? (
                  <Button variant="secondary" onClick={() => markPosted(video.id, video.short)}>
                    {posted ? copy.plan.isPosted(video.short) : copy.plan.markPosted(video.short)}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </Expander>
        );
      })}
    </div>
  );
}
