import { Card } from "../components/ui/Card.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";

export function Log({ log, topics }) {
  return (
    <div className="page">
      <SectionHeader title="Log" lede="Copies, status changes, and pasted links, newest first." />
      <Card>
        {log.length === 0 ? <p className="muted">Nothing recorded yet.</p> : null}
        {log.map((row) => {
          const topic = topics.find((item) => item.id === row.topicId);
          const when = row.at.replace("T", " ").slice(0, 16);
          return (
            <div className="list-row" key={row.id}>
              <span>{when} · {row.action}{topic ? " · " + topic.short : ""}</span>
              <span>{row.detail}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
