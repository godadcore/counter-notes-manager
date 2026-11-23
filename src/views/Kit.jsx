import { useState } from "react";
import { Badge, Chip } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Checkbox } from "../components/ui/Checkbox.jsx";
import { Expander } from "../components/ui/Expander.jsx";
import { Field } from "../components/ui/Field.jsx";
import { IconButton } from "../components/ui/IconButton.jsx";
import { Input } from "../components/ui/Input.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Segmented } from "../components/ui/Segmented.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Textarea } from "../components/ui/Textarea.jsx";
import { Toggle } from "../components/ui/Toggle.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { Plus } from "lucide-react";

const OPTIONS = [
  { value: "queued", label: "Queued" },
  { value: "scripted", label: "Scripted" },
  { value: "ready", label: "Ready to Post" }
];

export function Kit() {
  const toast = useToast();
  const [choice, setChoice] = useState("scripted");
  const [cadence, setCadence] = useState(4);
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [text, setText] = useState("Counter Notes");
  const [note, setNote] = useState("A note");

  return (
    <div className="page">
      <SectionHeader title="UI kit" lede="Development only. Every control, including hover, pressed, focus, and disabled." />
      <Card>
        <h2>Buttons</h2>
        <div className="kit-row">
          <Button>Primary</Button>
          <Button className="is-hover">Hover</Button>
          <Button className="is-pressed">Pressed</Button>
          <Button className="is-focus">Focus</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="secondary" className="is-hover">Hover</Button>
          <Button variant="secondary" className="is-pressed">Pressed</Button>
          <Button variant="secondary" disabled>Disabled</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="ghost" className="is-hover">Hover</Button>
          <Button variant="ghost" disabled>Disabled</Button>
          <IconButton label="Add"><Plus size={18} /></IconButton>
          <IconButton label="Add hover" className="is-hover"><Plus size={18} /></IconButton>
          <IconButton label="Add disabled" disabled><Plus size={18} /></IconButton>
        </div>
        <Button onClick={() => toast("Copied")}>Show toast</Button>
      </Card>
      <Card>
        <h2>Select, segmented, toggle, checkbox</h2>
        <Select id="kit-select" label="Status" hint="Opens as a sheet on a phone." value={choice} onChange={setChoice} options={OPTIONS} />
        <Select id="kit-select-off" label="Disabled select" value="queued" onChange={() => {}} options={OPTIONS} disabled />
        <Segmented label="Cadence" value={cadence} onChange={setCadence} options={[4, 5, 6, 7].map((value) => ({ value, label: String(value) }))} />
        <Segmented label="Disabled cadence" value={4} onChange={() => {}} options={[{ value: 4, label: "4" }]} disabled />
        <Toggle checked={on} onChange={setOn} label="Toggle on" />
        <Toggle checked={false} onChange={() => {}} label="Toggle off" />
        <Toggle checked={false} onChange={() => {}} label="Toggle disabled" disabled />
        <Checkbox checked={checked} onChange={setChecked} label="Checkbox on" />
        <Checkbox checked={false} onChange={() => {}} label="Checkbox off" />
        <Checkbox checked={false} onChange={() => {}} label="Checkbox disabled" disabled />
      </Card>
      <Card>
        <h2>Fields</h2>
        <Field id="kit-input" label="Input" hint="Hint text">
          <Input id="kit-input" value={text} onChange={(event) => setText(event.target.value)} />
        </Field>
        <Field id="kit-error" label="Input error" error="Add an evidence link.">
          <Input id="kit-error" value="" onChange={() => {}} />
        </Field>
        <Field id="kit-off" label="Disabled input">
          <Input id="kit-off" value="Locked" disabled onChange={() => {}} />
        </Field>
        <Field id="kit-area" label="Textarea">
          <Textarea id="kit-area" value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </Card>
      <Card>
        <h2>Badge, chip, expander</h2>
        <div className="kit-row">
          <Badge status="queued" />
          <Badge status="scripted" />
          <Badge status="ready" />
          <Badge status="posted" />
          <Chip>Chip</Chip>
          <Chip active>Active chip</Chip>
        </div>
        <Expander title="Expander closed by default">Hidden until opened.</Expander>
        <Expander title="Expander open" defaultOpen>Visible panel.</Expander>
      </Card>
    </div>
  );
}
