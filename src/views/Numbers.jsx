import { useState } from "react";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Textarea } from "../components/ui/Textarea.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { earnings, monetizationProgress, viewsNeeded } from "../engine/money.js";
import { monteCarlo } from "../engine/monteCarlo.js";
import { retentionDrop, topicScore } from "../engine/score.js";
import { copy } from "../copy.js";

function numberOrBlank(value) {
  if (value === "" || value == null) return "";
  return String(value);
}

export function Numbers({ stats, thresholds, weights, numbersInputs, saveNumbers, saveWeights, addStat }) {
  const toast = useToast();
  const saved = numbersInputs || {};
  const [duration, setDuration] = useState(numberOrBlank(saved.duration));
  const [targetHours, setTargetHours] = useState(numberOrBlank(saved.targetHours));
  const [earnViews, setEarnViews] = useState(numberOrBlank(saved.earnViews));
  const [rpmLow, setRpmLow] = useState(numberOrBlank(saved.rpmLow));
  const [rpmMid, setRpmMid] = useState(numberOrBlank(saved.rpmMid));
  const [rpmHigh, setRpmHigh] = useState(numberOrBlank(saved.rpmHigh));
  const [videos, setVideos] = useState(numberOrBlank(saved.videos));
  const [viewsMin, setViewsMin] = useState(numberOrBlank(saved.viewsMin));
  const [viewsMode, setViewsMode] = useState(numberOrBlank(saved.viewsMode));
  const [viewsMax, setViewsMax] = useState(numberOrBlank(saved.viewsMax));
  const [durMin, setDurMin] = useState(numberOrBlank(saved.durMin));
  const [durMode, setDurMode] = useState(numberOrBlank(saved.durMode));
  const [durMax, setDurMax] = useState(numberOrBlank(saved.durMax));
  const [curve, setCurve] = useState(saved.curve || "");
  const [demand, setDemand] = useState(numberOrBlank(saved.demand));
  const [freshness, setFreshness] = useState(numberOrBlank(saved.freshness));
  const [fit, setFit] = useState(numberOrBlank(saved.fit));
  const [competition, setCompetition] = useState(numberOrBlank(saved.competition));
  const [weight, setWeight] = useState({
    demand: weights.demand ?? 1,
    freshness: weights.freshness ?? 1,
    fit: weights.fit ?? 1,
    competition: weights.competition ?? 1
  });
  const [spread, setSpread] = useState(null);
  const [date, setDate] = useState("");
  const [subscribers, setSubscribers] = useState("");
  const [watchHours, setWatchHours] = useState("");

  const latest = stats[0];
  const progress = latest
    ? monetizationProgress(latest.subscribers, latest.watchHours, { thresholds }, { stats, today: new Date().toISOString().slice(0, 10) })
    : null;
  const needed = viewsNeeded(targetHours, duration);
  const money = earnViews !== "" && rpmLow !== "" && rpmMid !== "" && rpmHigh !== ""
    ? earnings(Number(earnViews), Number(rpmLow), Number(rpmMid), Number(rpmHigh))
    : null;
  const curveNumbers = curve.split(/[,\s]+/).filter(Boolean).map(Number).filter((value) => Number.isFinite(value));
  const drop = retentionDrop(curveNumbers);
  const score = demand !== "" && freshness !== "" && fit !== "" && competition !== ""
    ? topicScore({ demand, freshness, fit, competition }, weight)
    : null;

  function inputs() {
    return { duration, targetHours, earnViews, rpmLow, rpmMid, rpmHigh, videos, viewsMin, viewsMode, viewsMax, durMin, durMode, durMax, curve, demand, freshness, fit, competition };
  }

  async function runSpread() {
    const fields = [videos, viewsMin, viewsMode, viewsMax, durMin, durMode, durMax, rpmLow, rpmMid, rpmHigh];
    if (fields.some((value) => value === "")) {
      setSpread(null);
      toast(copy.toast.notEnough);
      return;
    }
    const result = monteCarlo({
      videos: Number(videos),
      views: { min: Number(viewsMin), mode: Number(viewsMode), max: Number(viewsMax) },
      duration: { min: Number(durMin), mode: Number(durMode), max: Number(durMax) },
      rpm: { min: Number(rpmLow), mode: Number(rpmMid), max: Number(rpmHigh) }
    });
    setSpread(result);
    try {
      await saveNumbers(inputs());
    } catch (error) {
      toast(error.message);
    }
  }

  async function saveChannel(event) {
    event.preventDefault();
    try {
      await addStat({ date, subscribers: Number(subscribers), watchHours: Number(watchHours) });
      setDate("");
      setSubscribers("");
      setWatchHours("");
      toast(copy.toast.numbersSaved);
    } catch (error) {
      toast(error.message);
    }
  }

  function percent(ratio) {
    return Math.max(0, Math.min(100, Math.round((ratio || 0) * 100))) + "%";
  }

  return (
    <div className="page">
      <SectionHeader title={copy.numbers.title} lede={copy.numbers.lede} />
      <Card>
        <h2>{copy.numbers.channel}</h2>
        <form onSubmit={saveChannel}>
          <Field id="stat-date" label={copy.numbers.date}>
            <Input id="stat-date" value={date} placeholder="2026-11-23" inputMode="numeric" onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field id="stat-subs" label={copy.numbers.subscribers}>
            <Input id="stat-subs" value={subscribers} inputMode="numeric" onChange={(event) => setSubscribers(event.target.value)} />
          </Field>
          <Field id="stat-hours" label={copy.numbers.hours}>
            <Input id="stat-hours" value={watchHours} inputMode="decimal" onChange={(event) => setWatchHours(event.target.value)} />
          </Field>
          <Button type="submit">{copy.numbers.save}</Button>
        </form>
        {stats.map((row) => (
          <div className="list-row" key={row.id}>
            <strong>{row.date}</strong>
            <span>{row.subscribers} subs · {row.watchHours} hours</span>
          </div>
        ))}
      </Card>
      <Card>
        <h2>{copy.numbers.progress}</h2>
        {stats.length === 0 ? <p>Not enough data.</p> : (
          <>
            <p className="muted">Inputs: {latest.date}, {latest.subscribers} subscribers, {latest.watchHours} qualified watch hours. Goal {progress.subscriberGoal} subscribers and {progress.watchHourGoal} watch hours. The other bar is {progress.otherWatchHourGoal} hours, effective {progress.effectiveOn}.</p>
            <p>{copy.numbers.subsEstimate}</p>
            <div className="progress"><span style={{ width: percent(progress.subscriberRatio) }} /></div>
            <p>{copy.numbers.hoursEstimate}</p>
            <div className="progress"><span style={{ width: percent(progress.watchHourRatio) }} /></div>
            <p className="muted">{progress.enoughToProject && progress.projectedDate ? "Projected date, estimate: " + progress.projectedDate : "Not enough data for a projected date."}</p>
          </>
        )}
      </Card>
      <Card>
        <h2>{copy.numbers.viewsNeeded}</h2>
        <Field id="target-hours" label={copy.numbers.targetHours}>
          <Input id="target-hours" value={targetHours} inputMode="decimal" onChange={(event) => setTargetHours(event.target.value)} />
        </Field>
        <Field id="avg-duration" label={copy.numbers.avgMinutes}>
          <Input id="avg-duration" value={duration} inputMode="decimal" onChange={(event) => setDuration(event.target.value)} />
        </Field>
        <p>{needed == null ? "Not enough data." : "Estimate: " + Math.round(needed).toLocaleString() + " views."}</p>
      </Card>
      <Card>
        <h2>{copy.numbers.earnings}</h2>
        <Field id="earn-views" label={copy.numbers.views}>
          <Input id="earn-views" value={earnViews} inputMode="numeric" onChange={(event) => setEarnViews(event.target.value)} />
        </Field>
        <Field id="rpm-low" label={copy.numbers.rpmLow}>
          <Input id="rpm-low" value={rpmLow} inputMode="decimal" onChange={(event) => setRpmLow(event.target.value)} />
        </Field>
        <Field id="rpm-mid" label={copy.numbers.rpmMid}>
          <Input id="rpm-mid" value={rpmMid} inputMode="decimal" onChange={(event) => setRpmMid(event.target.value)} />
        </Field>
        <Field id="rpm-high" label={copy.numbers.rpmHigh}>
          <Input id="rpm-high" value={rpmHigh} inputMode="decimal" onChange={(event) => setRpmHigh(event.target.value)} />
        </Field>
        <p>{money ? "Estimate: " + money.low.toFixed(2) + " to " + money.high.toFixed(2) + ". Mid " + money.mid.toFixed(2) + "." : "Not enough data."}</p>
      </Card>
      <Card>
        <h2>{copy.numbers.simulation}</h2>
        <p className="muted">{copy.numbers.simulationHelp}</p>
        <Field id="sim-videos" label={copy.numbers.videos}>
          <Input id="sim-videos" value={videos} inputMode="numeric" onChange={(event) => setVideos(event.target.value)} />
        </Field>
        <Field id="views-min" label={copy.numbers.viewsLow}><Input id="views-min" value={viewsMin} inputMode="numeric" onChange={(event) => setViewsMin(event.target.value)} /></Field>
        <Field id="views-mode" label={copy.numbers.viewsTypical}><Input id="views-mode" value={viewsMode} inputMode="numeric" onChange={(event) => setViewsMode(event.target.value)} /></Field>
        <Field id="views-max" label={copy.numbers.viewsHigh}><Input id="views-max" value={viewsMax} inputMode="numeric" onChange={(event) => setViewsMax(event.target.value)} /></Field>
        <Field id="dur-min" label={copy.numbers.minutesLow}><Input id="dur-min" value={durMin} inputMode="decimal" onChange={(event) => setDurMin(event.target.value)} /></Field>
        <Field id="dur-mode" label={copy.numbers.minutesTypical}><Input id="dur-mode" value={durMode} inputMode="decimal" onChange={(event) => setDurMode(event.target.value)} /></Field>
        <Field id="dur-max" label={copy.numbers.minutesHigh}><Input id="dur-max" value={durMax} inputMode="decimal" onChange={(event) => setDurMax(event.target.value)} /></Field>
        <Button onClick={runSpread}>{copy.numbers.run}</Button>
        {spread ? (
          <div>
            <p>Views, estimate: P10 {Math.round(spread.views.p10).toLocaleString()}, P50 {Math.round(spread.views.p50).toLocaleString()}, P90 {Math.round(spread.views.p90).toLocaleString()}.</p>
            <p>Watch hours, estimate: P10 {spread.watchHours.p10.toFixed(1)}, P50 {spread.watchHours.p50.toFixed(1)}, P90 {spread.watchHours.p90.toFixed(1)}.</p>
            <p>Revenue, estimate: P10 {spread.revenue.p10.toFixed(2)}, P50 {spread.revenue.p50.toFixed(2)}, P90 {spread.revenue.p90.toFixed(2)}.</p>
          </div>
        ) : <p>Not enough data.</p>}
      </Card>
      <Card>
        <h2>{copy.numbers.score}</h2>
        <p className="muted">{copy.numbers.scoreHelp} Weights are {weight.demand}, {weight.freshness}, {weight.fit}, {weight.competition}.</p>
        <Field id="demand" label={copy.numbers.demand}><Input id="demand" value={demand} inputMode="decimal" onChange={(event) => setDemand(event.target.value)} /></Field>
        <Field id="fresh" label={copy.numbers.freshness}><Input id="fresh" value={freshness} inputMode="decimal" onChange={(event) => setFreshness(event.target.value)} /></Field>
        <Field id="fit" label={copy.numbers.fit}><Input id="fit" value={fit} inputMode="decimal" onChange={(event) => setFit(event.target.value)} /></Field>
        <Field id="competition" label={copy.numbers.competition}><Input id="competition" value={competition} inputMode="decimal" onChange={(event) => setCompetition(event.target.value)} /></Field>
        <Field id="w-demand" label={copy.numbers.demandWeight}><Input id="w-demand" value={weight.demand} inputMode="decimal" onChange={(event) => setWeight({ ...weight, demand: event.target.value })} /></Field>
        <Field id="w-fresh" label={copy.numbers.freshnessWeight}><Input id="w-fresh" value={weight.freshness} inputMode="decimal" onChange={(event) => setWeight({ ...weight, freshness: event.target.value })} /></Field>
        <Field id="w-fit" label={copy.numbers.fitWeight}><Input id="w-fit" value={weight.fit} inputMode="decimal" onChange={(event) => setWeight({ ...weight, fit: event.target.value })} /></Field>
        <Field id="w-comp" label={copy.numbers.competitionWeight}><Input id="w-comp" value={weight.competition} inputMode="decimal" onChange={(event) => setWeight({ ...weight, competition: event.target.value })} /></Field>
        <Button variant="secondary" onClick={() => saveWeights(weight).then(() => toast(copy.toast.weightsSaved)).catch((error) => toast(error.message))}>{copy.numbers.saveWeights}</Button>
        <p>{score == null ? "Not enough data." : "Estimate: " + score.toFixed(2) + "."}</p>
      </Card>
      <Card>
        <h2>{copy.numbers.retention}</h2>
        <Field id="curve" label={copy.numbers.curve} hint={copy.numbers.curveHint}>
          <Textarea id="curve" value={curve} onChange={(event) => setCurve(event.target.value)} />
        </Field>
        <p>{drop ? "Steepest drop, estimate: " + drop.from + " to " + drop.to + " (" + drop.drop + ")." : "Not enough data."}</p>
      </Card>
      <p className="muted">Thresholds in config: {thresholds.subscribers} subscribers, {thresholds.watchHoursNow} hours now, {thresholds.watchHoursLater} hours from {thresholds.laterEffectiveOn}.</p>
    </div>
  );
}
