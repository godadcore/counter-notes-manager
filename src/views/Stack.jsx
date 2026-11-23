import { useEffect, useRef } from "react";
import { useToast } from "../components/ui/Toast.jsx";
import { CopyBlock, writeClipboard } from "../components/CopyBlock.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { HoldList } from "../components/HoldList.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Checkbox } from "../components/ui/Checkbox.jsx";
import { Expander } from "../components/ui/Expander.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Textarea } from "../components/ui/Textarea.jsx";
import { PLAN, STATUS_OPTIONS, VIDEOS } from "../data.js";
import { copy } from "../copy.js";
import { claimFindings } from "../status.js";
import { buildScenePrompt, runtimeSeconds } from "../engine/videoPrompt.js";
import { titleProofWarning } from "../engine/proofTitle.js";
import { weeklyReview } from "../engine/review.js";
import { factPromptText, researchPromptText, SOURCE_CHECKS, stackThumbPrompt, withPart } from "../prompts.js";
import { VideoPrompt } from "../components/VideoPrompt.jsx";
import { WinnerLists } from "../components/WinnerLists.jsx";

function todayStamp() {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}

function topicFrom(stack) {
  if (stack.topicId === "custom") {
    const title = stack.custom.trim() || copy.today.untitled;
    return {
      custom: true,
      title,
      length: "8 min",
      angle: "Why " + title + " succeeded, failed, or lost to a rival. Use a timeline, a price comparison, and one simple chart.",
      rival: "the closest everyday rival a shopper would recognize",
      claim: "Only the numbers in the proof notes. If a number is missing, mark it check this.",
      thumb: "CHECK THE MATH",
      scene: "one chart and one price tag"
    };
  }
  const video = VIDEOS.find((item) => item.id === Number(stack.topicId)) || VIDEOS[0];
  return { ...video, custom: false };
}

export function Stack({ stack, setStack, cadence, topics, findings, series, videoSettings, saveVideoSettings, dossiers, performance, runResearch, ignoreWinner, restoreWinner, splitTopic, setStatus, setFindingUrl, logEvent, nextPostId, niche }) {
  const toast = useToast();
  const topic = topicFrom(stack);
  const overlay = (stack.thumbLine || "").trim() || topic.thumb;
  const seenLinks = useRef(new Set());
  const topicId = topic.custom ? null : topic.id;
  const topicFindings = findings.filter((item) => item.topicId === topicId);
  const options = VIDEOS.map((video) => ({
    value: String(video.id),
    label: video.short,
    trigger: video.title
  })).concat([{
    value: "custom",
    label: copy.today.anotherBrand,
    trigger: stack.custom.trim() || copy.today.anotherBrand
  }]);
  const boot = useRef(false);

  function patch(partial, keepSaved = false) {
    setStack((current) => ({ ...current, ...partial, saved: keepSaved ? current.saved : false }));
  }

  function setTopic(value) {
    const next = value === "custom" ? "custom" : Number(value);
    setStack((current) => {
      if (String(next) === String(current.topicId)) return current;
      const video = VIDEOS.find((item) => item.id === next);
      return {
        ...current,
        topicId: next,
        checks: {},
        usedOn: "",
        saved: false,
        partIndex: 1,
        thumbLine: next === "custom" ? (current.thumbLine || "CHECK THE MATH") : (video ? video.thumb : "")
      };
    });
  }

  function noteLinks(value) {
    const urls = value.match(/https?:\/\/\S+/g) || [];
    for (const url of urls) {
      if (seenLinks.current.has(url)) continue;
      seenLinks.current.add(url);
      logEvent({ action: "link", topicId, detail: url });
    }
  }

  const holds = claimFindings(topicFindings).filter((item) => item.hold);
  const videoLocked = !topic.custom && holds.length > 0;
  const used = stack.usedOn === todayStamp() ? copy.today.usedToday : (stack.usedOn ? copy.today.usedOn(stack.usedOn) : copy.today.notUsed);
  const split = (series || []).find((item) => item.topicId === topicId);
  const parts = split?.parts || [];
  const part = parts.find((item) => item.index === Number(stack.partIndex)) || parts[0] || null;
  const dossier = (dossiers || []).find((item) => item.topicId === topicId) || null;
  const status = (topics || []).find((item) => item.id === topicId)?.status || "queued";
  const review = weeklyReview((performance || []).map((row) => ({
    ...row,
    title: (topics || []).find((item) => item.id === row.topicId)?.title || "",
    runtime: runtimeSeconds(VIDEOS.find((item) => item.id === row.topicId)?.length)
  })), videoSettings?.maxClipSeconds || 8);
  const rule = review.videos.find((item) => item.topicId === topicId)?.rule || "";
  const scene = buildScenePrompt(topic, topicFindings, {
    toolName: videoSettings?.toolName || "generic",
    maxClipSeconds: videoSettings?.maxClipSeconds || 8,
    detail: videoSettings?.detail === "high" ? "high" : "normal",
    part,
    parts,
    dossier
  });
  const proofWarning = titleProofWarning(topic.title, topicFindings);

  async function copyPrompt(text, label) {
    try {
      await writeClipboard(text);
      toast(copy.toast.copied);
      try {
        await logEvent?.({ action: "copy", topicId, detail: label });
      } catch {
        /* The copy already succeeded. */
      }
    } catch {
      toast(copy.toast.copyFailed);
    }
  }

  useEffect(() => {
    if (boot.current) return;
    boot.current = true;
    if (nextPostId) setTopic(String(nextPostId));
  }, [nextPostId]);

  useEffect(() => {
    if (!topicId) return;
    if ((series || []).some((item) => item.topicId === topicId)) return;
    splitTopic(topicId).catch((error) => toast(error.message));
  }, [topicId, series]);

  function scoped(text) {
    return withPart(text, part, parts.length, cadence);
  }

  async function changeStatus(next) {
    try {
      await setStatus(topicId, next);
    } catch (error) {
      toast(error.message);
    }
  }

  async function run() {
    if (!topicId) {
      toast(copy.toast.pickVideo);
      return;
    }
    try {
      const result = await runResearch(topicId);
      toast(result.started === false ? copy.toast.researchBusy : copy.toast.researchStarted);
    } catch (error) {
      toast(error.message);
    }
  }

  const researchText = scoped(researchPromptText(topic, stack.notes, cadence));
  const thumbText = scoped(stackThumbPrompt(topic, overlay));
  const factText = scoped(factPromptText(topic, stack.notes));
  const planDay = topic.custom ? null : PLAN.find((item) => item.postId === topic.id);
  const dayLabel = topic.custom ? copy.today.anotherBrand : (planDay ? copy.today.day(planDay.day) : "");
  const statusHint = holds.length ? (holds.length === 1 ? copy.today.needsOne : copy.today.needsMany(holds.length)) : copy.today.allClear;

  return (
    <div className="page">
      <Card>
        {dayLabel ? <Badge>{dayLabel}</Badge> : null}
        <Select
          id="stack-topic"
          label={copy.today.chooseVideo}
          sheetTitle={copy.today.chooseVideo}
          hideLabel
          value={String(stack.topicId)}
          onChange={setTopic}
          options={options}
        />
        {topic.custom ? (
          <Field id="stack-custom" label={copy.today.brandLabel}>
            <Input id="stack-custom" value={stack.custom} placeholder={copy.today.brandPlaceholder} onChange={(event) => patch({ custom: event.target.value })} />
          </Field>
        ) : null}
        {parts.length > 1 ? (
          <Select
            id="stack-part"
            label={copy.today.partLabel}
            sheetTitle={copy.today.partLabel}
            value={String(part.index)}
            onChange={(value) => patch({ partIndex: Number(value) }, true)}
            options={parts.map((item) => ({ value: String(item.index), label: copy.today.partOption(item) }))}
          />
        ) : null}
        <div className="btn-row">
          <Button variant="secondary" data-prompt="research" onClick={() => copyPrompt(researchText, copy.today.research)}>{copy.today.research}</Button>
          <Button variant="secondary" data-prompt="video" disabled={videoLocked} aria-describedby={videoLocked ? "video-needs-evidence" : undefined} onClick={() => copyPrompt(scene.text, copy.today.video)}>{copy.today.video}</Button>
          <Button variant="secondary" data-prompt="thumbnail" onClick={() => copyPrompt(thumbText, copy.today.thumbnail)}>{copy.today.thumbnail}</Button>
          <Button variant="secondary" data-prompt="fact" onClick={() => copyPrompt(factText, copy.today.fact)}>{copy.today.fact}</Button>
        </div>
        {videoLocked ? <p id="video-needs-evidence" className="muted">{copy.today.videoLocked}</p> : null}
        {proofWarning ? (
          <p className="muted" data-proof-warning="true">
            {copy.today.numberWarning(proofWarning.numbers.join(", "))}
            {" "}
            {proofWarning.suggestion ? copy.today.useWording(proofWarning.suggestion) : copy.today.noWording}
          </p>
        ) : null}
      </Card>
      {(niche?.keywords || []).length && (niche?.channels || []).length ? null : (
        <p className="muted" data-setup-block="true">{copy.today.setupBlocked}</p>
      )}
      <div className="btn-row">
        <Button onClick={run}>{copy.today.run}</Button>
        <Button variant="secondary" onClick={() => setStack((current) => ({ ...current, usedOn: todayStamp() }))}>{copy.today.markUsed}</Button>
      </div>
      <p className="muted">{used}</p>
      <Card>
        <h2>{copy.today.notesTitle}</h2>
        <p>{rule ? copy.today.rule(rule) : copy.today.noRule}</p>
        <WinnerLists
          dossier={dossier}
          onIgnore={(videoId) => {
            ignoreWinner(Number(stack.topicId), videoId)
              .then(() => toast(copy.toast.ignored))
              .catch((error) => toast(error.message));
          }}
          onRestore={(videoId) => {
            restoreWinner(Number(stack.topicId), videoId)
              .then(() => toast(copy.toast.restored))
              .catch((error) => toast(error.message));
          }}
        />
        {dossier?.text ? <pre className="copy-box">{dossier.text.replaceAll("Verified", "Confirmed").replaceAll("Needs check", "Check this").replaceAll("Dossier", "Research notes")}</pre> : <p className="muted">{copy.today.notesEmpty}</p>}
      </Card>
      <Expander title={copy.today.research}>
        <CopyBlock text={researchText} label={copy.today.researchPrompt} topicId={topicId} onCopied={logEvent} variant="secondary" tall />
      </Expander>
      <Expander title={copy.today.video}>
        <VideoPrompt
          topic={topic}
          findings={topicFindings}
          part={part}
          parts={parts}
          settings={videoSettings}
          saveSettings={saveVideoSettings}
          logEvent={logEvent}
          topicId={topicId}
          dossier={dossier}
        />
      </Expander>
      <Expander title={copy.today.thumbnail}>
        <CopyBlock text={thumbText} label={copy.today.thumbPrompt} topicId={topicId} onCopied={logEvent} variant="secondary" />
      </Expander>
      <Expander title={copy.today.fact}>
        <Field id="stack-notes" label={copy.today.notesLabel} hint={copy.today.notesHint}>
          <Textarea id="stack-notes" value={stack.notes} onChange={(event) => patch({ notes: event.target.value }, true)} onBlur={(event) => noteLinks(event.target.value)} />
        </Field>
        {SOURCE_CHECKS.map((item) => (
          <Checkbox
            key={item.key}
            checked={!!stack.checks[item.key]}
            label={copy.checks[item.key] || item.label}
            onChange={() => patch({ checks: { ...stack.checks, [item.key]: !stack.checks[item.key] } }, true)}
          />
        ))}
        {!topic.custom ? (
          <>
            <p className="muted">{copy.today.checkHelp}</p>
            <HoldList findings={topicFindings} onSave={setFindingUrl} />
            <Select
              id="stack-status"
              label={copy.today.status}
              value={status}
              hint={statusHint}
              onChange={changeStatus}
              options={STATUS_OPTIONS.map((item) => ({ value: item.id, label: copy.status[item.id] || item.label }))}
            />
          </>
        ) : null}
        <CopyBlock text={factText} label={copy.today.factPrompt} topicId={topicId} onCopied={logEvent} variant="secondary" tall />
      </Expander>
      <div hidden data-prompts={JSON.stringify({ research: researchText, video: scene.text, thumbnail: thumbText, fact: factText, videoLocked })} />
    </div>
  );
}
