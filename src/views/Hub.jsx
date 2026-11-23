import { Card } from "../components/ui/Card.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { copy } from "../copy.js";

export function Hub() {
  return (
    <div className="page">
      <SectionHeader title={copy.character.title} lede={copy.character.lede} />
      <Card>
        <img src="/Logo.png" alt={copy.character.logo} className="asset-shot" />
        <img src="/Thumbnail.png" alt={copy.character.thumb} className="asset-shot" />
        <img src="/Character.png" alt={copy.character.host} className="asset-shot character-shot" />
      </Card>
    </div>
  );
}
