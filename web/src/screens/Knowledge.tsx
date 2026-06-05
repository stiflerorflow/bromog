import { useState } from "react";
import { KNOWLEDGE, type KnowledgeEntry } from "../data/knowledge";

export function Knowledge() {
  return (
    <div className="scroll">
      <h1>Knowledge</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        The why behind the program. Tap any card to read more.
      </p>
      {KNOWLEDGE.map((section) => (
        <section key={section.id}>
          <h2 className="k-section">{section.title}</h2>
          {section.entries.map((entry) => (
            <KCard key={entry.title} entry={entry} />
          ))}
        </section>
      ))}
    </div>
  );
}

function KCard({ entry }: { entry: KnowledgeEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`card k-card${open ? " open" : ""}`}>
      <button className="k-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="k-text">
          <div className="k-title">{entry.title}</div>
          <div className="k-headline">{entry.headline}</div>
        </div>
        <span className="k-chevron">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="k-body">
          {entry.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </div>
  );
}
