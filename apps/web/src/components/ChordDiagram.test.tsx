import { CHORD_CATALOG, getChord, type ChordShape } from '@cifrai/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChordDiagram, describeChord } from './ChordDiagram';

const chord = (id: string): ChordShape => {
  const found = getChord(id);
  if (found === undefined) throw new Error(id);
  return found;
};

const parts = (container: HTMLElement, selector: string) =>
  [...container.querySelectorAll(selector)] as SVGElement[];

const FHIGH: ChordShape = {
  id: 'bm',
  name: 'Bm',
  namePt: 'Si menor',
  frets: [-1, 2, 4, 4, 3, 2],
  fingers: [0, 1, 3, 4, 2, 1],
  barre: { fret: 2, fromString: 5, toString: 1, finger: 1 },
  baseFret: 2,
};

describe('ChordDiagram', () => {
  it('desenha 6 cordas e as casas esperadas', () => {
    const { container } = render(<ChordDiagram chord={chord('em')} />);
    expect(parts(container, '[data-part="string"]')).toHaveLength(6);
    expect(parts(container, '[data-part="nut"]')).toHaveLength(1);
    expect(parts(container, '[data-part="fret"]')).toHaveLength(4);
  });

  it('usa 5 casas quando a digitação precisa', () => {
    const { container } = render(<ChordDiagram chord={{ ...FHIGH, baseFret: 2 }} />);
    expect(parts(container, '[data-part="nut"],[data-part="fret"]')).toHaveLength(5);
  });

  it('marca X, O e dedos conforme os dados (Am: x02210)', () => {
    const { container } = render(<ChordDiagram chord={chord('am')} />);
    expect(parts(container, '[data-kind="muted"]').map((e) => e.dataset['string'])).toEqual(['6']);
    expect(parts(container, '[data-kind="open"]').map((e) => e.dataset['string'])).toEqual([
      '5',
      '1',
    ]);
    expect(
      parts(container, '[data-kind="finger"]').map((e) => [e.dataset['string'], e.dataset['fret']]),
    ).toEqual([
      ['4', '2'],
      ['3', '2'],
      ['2', '1'],
    ]);
    expect(container.querySelector('[data-kind="barre"]')).toBeNull();
  });

  it('mostra o número do dedo só com showFingers', () => {
    const on = render(<ChordDiagram chord={chord('am')} />);
    const numbers = [...on.container.querySelectorAll('[data-kind="finger"] text')].map(
      (e) => e.textContent,
    );
    expect(numbers).toEqual(['2', '3', '1']);
    on.unmount();
    const off = render(<ChordDiagram chord={chord('am')} showFingers={false} />);
    expect(off.container.querySelectorAll('[data-kind="finger"] text')).toHaveLength(0);
    expect(off.container.querySelectorAll('[data-kind="finger"]')).toHaveLength(3);
  });

  it('desenha pestana, sem bolinhas duplicadas na casa da pestana', () => {
    const { container } = render(<ChordDiagram chord={FHIGH} />);
    const barre = container.querySelector('[data-kind="barre"]');
    expect(barre?.getAttribute('data-fret')).toBe('2');
    expect(barre?.querySelector('rect')?.getAttribute('rx')).not.toBeNull();
    expect(parts(container, '[data-kind="finger"]').map((e) => e.dataset['string'])).toEqual([
      '4',
      '3',
      '2',
    ]);
  });

  it('baseFret > 1 mostra a casa inicial e tira o nut grosso', () => {
    const { container } = render(<ChordDiagram chord={FHIGH} />);
    expect(container.querySelector('[data-part="base-fret"]')?.textContent).toBe('2ª');
    expect(container.querySelector('[data-part="nut"]')?.getAttribute('stroke-width')).toBe('1.2');
    const low = render(<ChordDiagram chord={chord('em')} />);
    expect(low.container.querySelector('[data-part="base-fret"]')).toBeNull();
    expect(low.container.querySelector('[data-part="nut"]')?.getAttribute('stroke-width')).toBe(
      '5',
    );
  });

  it('canhoto espelha a posição das marcações; destro tem a 6ª à esquerda', () => {
    const xs = (leftHanded: boolean) => {
      const { container, unmount } = render(
        <ChordDiagram chord={chord('am')} leftHanded={leftHanded} />,
      );
      const result = {
        string6: Number(
          container.querySelector('[data-part="string"][data-string="6"]')?.getAttribute('x1'),
        ),
        string1: Number(
          container.querySelector('[data-part="string"][data-string="1"]')?.getAttribute('x1'),
        ),
        muted: Number(container.querySelector('[data-kind="muted"]')?.getAttribute('data-cx')),
        finger2: Number(
          container.querySelector('[data-kind="finger"][data-string="2"]')?.getAttribute('data-cx'),
        ),
      };
      unmount();
      return result;
    };
    const right = xs(false);
    const left = xs(true);
    expect(right.string6).toBeLessThan(right.string1);
    expect(left.string6).toBeGreaterThan(left.string1);
    const center = (right.string6 + right.string1) / 2;
    for (const key of ['string6', 'string1', 'muted', 'finger2'] as const) {
      expect(left[key] - center).toBeCloseTo(-(right[key] - center));
    }
  });

  it('canhoto move o rótulo da casa inicial para o outro lado', () => {
    const anchor = (leftHanded: boolean) => {
      const { container, unmount } = render(<ChordDiagram chord={FHIGH} leftHanded={leftHanded} />);
      const value = container.querySelector('[data-part="base-fret"]')?.getAttribute('text-anchor');
      unmount();
      return value;
    };
    expect(anchor(false)).toBe('end');
    expect(anchor(true)).toBe('start');
  });

  it('aria-label, title e desc descrevem o acorde em pt-BR', () => {
    render(<ChordDiagram chord={chord('am')} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute(
      'aria-label',
      'Acorde Am, Lá menor: corda 6 muda, corda 5 solta, corda 4 casa 2 dedo 2, corda 3 casa 2 dedo 3, corda 2 casa 1 dedo 1, corda 1 solta',
    );
    expect(img.querySelector('title')?.textContent).toBe('Acorde Am, Lá menor');
    expect(img.querySelector('desc')?.textContent).toBe(img.getAttribute('aria-label'));
  });

  it('descrição sem dedos, com pestana e posição alta; title customizado', () => {
    expect(describeChord(FHIGH, false)).toBe(
      'corda 6 muda, corda 5 casa 2, corda 4 casa 4, corda 3 casa 4, corda 2 casa 3, corda 1 casa 2, pestana na casa 2 com o dedo 1, das cordas 5 a 1, diagrama começa na casa 2',
    );
    render(<ChordDiagram chord={FHIGH} title="Exemplo" showFingers={false} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Exemplo: corda 6 muda/);
  });

  it('aceita chordId e mostra aviso para id inexistente', () => {
    const { rerender } = render(<ChordDiagram chordId="g7" />);
    expect(screen.getByRole('img').getAttribute('data-chord-id')).toBe('g7');
    rerender(<ChordDiagram chordId="nao-existe" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Acorde não encontrado.');
  });

  it('size fixa a largura; sem size preenche o container com mínimo de 140px', () => {
    const { rerender } = render(<ChordDiagram chordId="em" size={200} />);
    expect(screen.getByRole('img')).toHaveStyle({ width: '200px' });
    rerender(<ChordDiagram chordId="em" />);
    expect(screen.getByRole('img')).toHaveStyle({ width: '100%', minWidth: '140px' });
  });

  it.each(CHORD_CATALOG.map((c) => [c.id]))('catálogo: %s renderiza (destro e canhoto)', (id) => {
    for (const leftHanded of [false, true]) {
      const { container, unmount } = render(<ChordDiagram chordId={id} leftHanded={leftHanded} />);
      const shape = chord(id);
      expect(parts(container, '[data-part="string"]')).toHaveLength(6);
      expect(parts(container, '[data-kind="muted"]')).toHaveLength(
        shape.frets.filter((f) => f === -1).length,
      );
      expect(parts(container, '[data-kind="open"]')).toHaveLength(
        shape.frets.filter((f) => f === 0).length,
      );
      expect(parts(container, '[data-kind="finger"]')).toHaveLength(
        shape.frets.filter((f) => f > 0).length,
      );
      unmount();
    }
  });

  it('não usa cores fixas: só tokens', () => {
    const { container } = render(<ChordDiagram chordId="c" />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}|rgb\(/i);
  });
});
