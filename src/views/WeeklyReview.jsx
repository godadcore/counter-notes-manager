import { useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Textarea } from "../components/ui/Textarea.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { runtimeSeconds } from "../engine/videoPrompt.js";
import { weeklyReview } from "../engine/review.js";
import { VIDEOS } from "../data.js";
import { copy } from "../copy.js";

export function WeeklyReview({ topics, performance, maxClipSeconds, savePerformance }) {
  const toast = useToast();
  const [topicId, setTopicId] = useState(String((topics[0] && topics[0].id) || ""));
  const [ctr, setCtr] = useState("");
  const [impressions, setImpressions] = useState("");
  const [duration, setDuration] = useState("");
  const [curve, setCurve] = useState("");

  async function save() {
    try {
      await savePerformance({
        topicId: Number(topicId),
        ctr,
        impressions,
        avgViewDuration: duration,
        retention: curve
      });
      toast(copy.toast.performanceSaved);
    } catch (error) {
      toast(error.message);
    }
  }

  const entries = (performance || []).map((row) => {
    const topic = topics.find((item) => item.id === row.topicId);
    const video = VIDEOS.find((item) => item.id === row.topicId);
    return {
      ...row,
      title: topic?.title || video?.title || "",
      runtime: runtimeSeconds(video?.length || topic?.length)
    };
  });
  const review = weeklyReview(entries, maxClipSeconds || 8);

  return (
    <Card>
      <h2>{copy.review.title}</h2>
      <p className="muted">{copy.review.help}</p>
      <Select
        id="review-topic"
        label={copy.review.video}
        value={topicId}
        onChange={setTopicId}
        options={topics.map((topic) => ({ value: String(topic.id), label: topic.short + ". " + topic.title }))}
      />
      <Field id="review-ctr" label={copy.review.ctr}>
        <Input id="review-ctr" value={ctr} inputMode="decimal" onChange={(event) => setCtr(event.target.value)} />
      </Field>
      <Field id="review-impressions" label={copy.review.impressions}>
        <Input id="review-impressions" value={impressions} inputMode="numeric" onChange={(event) => setImpressions(event.target.value)} />
      </Field>
      <Field id="review-duration" label={copy.review.duration}>
        <Input id="review-duration" value={duration} inputMode="decimal" onChange={(event) => setDuration(event.target.value)} />
      </Field>
      <Field id="review-curve" label={copy.review.curve} hint={copy.review.curveHint}>
        <Textarea id="review-curve" value={curve} onChange={(event) => setCurve(event.target.value)} />
      </Field>
      <Button onClick={save}>{copy.review.save}</Button>
      {!review.videos.length ? <p>{copy.toast.notEnough}</p> : null}
      {review.median ? <p className="muted">Your median: CTR {review.median.ctr}, impressions {review.median.impressions}, average view duration {review.median.avgViewDuration} seconds.</p> : null}
      {review.videos.map((item) => (
        <div key={item.topicId}>
          <p><strong>{item.title}</strong></p>
          <p className="muted">CTR {item.versus.ctr}. Impressions {item.versus.impressions}. Average view duration {item.versus.avgViewDuration}.</p>
          {item.drop ? <p>Viewers left at {item.scene}. The drop is {item.drop.from} to {item.drop.to}. Rule: {item.rule}.</p> : <p>Not enough retention data.</p>}
          {item.suggestion ? <p><Badge status="unverified">{copy.review.suggestion}</Badge> {item.suggestion}</p> : null}
        </div>
      ))}
    </Card>
  );
}
