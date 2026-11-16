import { CHORD_CATALOG } from '@cifrai/shared';
import { useState } from 'react';
import { ChordDiagram } from '../../components/ChordDiagram';

// Página só de desenvolvimento (rota registrada apenas com import.meta.env.DEV): textos fora do catálogo i18n de propósito.
export default function ChordGalleryPage() {
  const [leftHanded, setLeftHanded] = useState(false);
  const [showFingers, setShowFingers] = useState(true);

  return (
    <section aria-labelledby="gallery-title" className="flex flex-col gap-4">
      <h1 id="gallery-title" className="text-2xl font-bold">
        Galeria de acordes (dev)
      </h1>
      <div className="flex flex-wrap gap-4">
        <label className="flex min-h-tap items-center gap-2">
          <input
            type="checkbox"
            className="size-6"
            checked={leftHanded}
            onChange={(event) => setLeftHanded(event.target.checked)}
          />
          Canhoto
        </label>
        <label className="flex min-h-tap items-center gap-2">
          <input
            type="checkbox"
            className="size-6"
            checked={showFingers}
            onChange={(event) => setShowFingers(event.target.checked)}
          />
          Mostrar dedos
        </label>
      </div>
      <ul className="grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 lg:grid-cols-5">
        {CHORD_CATALOG.map((chord) => (
          <li key={chord.id} className="rounded-card border border-border bg-surface p-2">
            <ChordDiagram chord={chord} leftHanded={leftHanded} showFingers={showFingers} />
          </li>
        ))}
      </ul>
    </section>
  );
}
