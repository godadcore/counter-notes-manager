import { Button } from "./ui/Button.jsx";
import { copy } from "../copy.js";

function views(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function line(item) {
  const words = (item.words || []).join(", ");
  return [
    item.multiple,
    views(item.views) + " views",
    "sample " + (item.sample || 0),
    item.channel,
    item.title,
    words ? "words: " + words : ""
  ].filter(Boolean).join(" | ");
}

function Group({ title, rows, onIgnore }) {
  const items = rows || [];
  return (
    <>
      <h2>{title}</h2>
      {items.length ? items.map((item) => (
        <div className="list-row" key={(item.videoId || item.title) + title}>
          <span className="winner-copy">{line(item)}</span>
          {onIgnore ? (
            <Button variant="secondary" aria-label={copy.today.ignoreVideo(item.title)} onClick={() => onIgnore(item.videoId)}>
              {copy.today.ignore}
            </Button>
          ) : null}
        </div>
      )) : <p className="muted">{copy.today.listEmpty}</p>}
    </>
  );
}

function Ignored({ rows, onRestore }) {
  const items = rows || [];
  return (
    <>
      <h2>{copy.today.ignoredTitle}</h2>
      {items.length ? items.map((item) => (
        <div className="list-row" key={item.videoId}>
          <span className="winner-copy">{[item.channel, item.title].filter(Boolean).join(" | ")}</span>
          <Button variant="secondary" aria-label={copy.today.undoVideo(item.title)} onClick={() => onRestore(item.videoId)}>
            {copy.today.undo}
          </Button>
        </div>
      )) : <p className="muted">{copy.today.listEmpty}</p>}
    </>
  );
}

export function WinnerLists({ dossier, onIgnore, onRestore }) {
  if (!dossier || !Array.isArray(dossier.winners)) return null;
  return (
    <>
      <Group title={copy.today.winnersTitle} rows={dossier.winners} onIgnore={onIgnore} />
      <Group title={copy.today.sameTopicTitle} rows={dossier.sameTopicWinners} />
      <Group title={copy.today.tooSmallTitle} rows={dossier.tooSmall} />
      {onRestore ? <Ignored rows={dossier.ignored} onRestore={onRestore} /> : null}
    </>
  );
}
