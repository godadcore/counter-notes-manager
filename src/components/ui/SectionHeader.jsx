export function SectionHeader({ title, lede, action }) {
  return (
    <header className="section-head">
      <h1>{title}</h1>
      {lede ? <p>{lede}</p> : null}
      {action || null}
    </header>
  );
}
