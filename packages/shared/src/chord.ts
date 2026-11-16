import { z } from 'zod';

/** Mesmo formato do `chordId` de packages/content (que importa daqui). */
export const CHORD_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Maior casa aceita (12ª = oitava). */
export const MAX_FRET = 12;
/** Quantas casas cabem na janela do diagrama (a partir de `baseFret`). */
export const MAX_FRET_SPAN = 5;
export const STRING_COUNT = 6;

export const CHORD_ROOT_PATTERN = /^[A-G][#b]?$/;
export const CHORD_QUALITIES = ['major', 'minor', 'dominant7'] as const;
export type ChordQuality = (typeof CHORD_QUALITIES)[number];
/** Nota fundamental em cifra (ex.: G, F#, Bb). */
export type ChordRoot = string;

const nameText = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value.trim().length > 0, { message: 'O texto não pode ser vazio.' });

/** -1 = corda muda (X), 0 = solta (O), n >= 1 = casa pressionada. */
const FretSchema = z.number().int().min(-1).max(MAX_FRET);
/** 0 = nenhum dedo, 1 indicador, 2 médio, 3 anelar, 4 mindinho. */
const FingerSchema = z.number().int().min(0).max(4);
const StringNumberSchema = z.number().int().min(1).max(STRING_COUNT);

const six = <T extends z.ZodType>(item: T) => z.tuple([item, item, item, item, item, item]);

export const BarreSchema = z.strictObject({
  fret: z.number().int().min(1).max(MAX_FRET),
  /** Corda mais grave coberta (6 = mais grave). */
  fromString: StringNumberSchema,
  /** Corda mais aguda coberta (1 = mais aguda). */
  toString: StringNumberSchema,
  finger: z.number().int().min(1).max(4),
});

export const ChordShapeSchema = z
  .strictObject({
    id: z.string().regex(CHORD_ID_PATTERN, { message: 'ID de acorde inválido (ex.: em, d7).' }),
    /** Cifra (ex.: Am). */
    name: nameText(12),
    /** Nome por extenso em pt-BR (ex.: Lá menor). */
    namePt: nameText(40).optional(),
    /** Nota fundamental (ex.: G). Com `quality`, gera o nome de exibição (`chordDisplayName`). */
    root: z
      .string()
      .regex(CHORD_ROOT_PATTERN, { message: 'Nota inválida (ex.: G, F#, Bb).' })
      .optional(),
    quality: z.enum(CHORD_QUALITIES).optional(),
    /** Ordem: 6ª corda (mais grave) até a 1ª (mais aguda). Casas absolutas no braço. */
    frets: six(FretSchema),
    fingers: six(FingerSchema),
    barre: BarreSchema.optional(),
    /** Primeira casa da janela do diagrama; > 1 mostra o número da casa. */
    baseFret: z.number().int().min(1).max(MAX_FRET),
  })
  .superRefine((chord, ctx) => {
    const fail = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    const { frets, fingers, barre, baseFret } = chord;
    if ((chord.root === undefined) !== (chord.quality === undefined)) {
      fail(['quality'], 'root e quality devem vir juntos.');
    }
    const stringAt = (index: number) => STRING_COUNT - index;

    const pressed = frets.filter((fret) => fret >= 1);
    if (pressed.length > 0) {
      const lowest = Math.min(...pressed);
      const highest = Math.max(...pressed);
      if (lowest < baseFret) fail(['baseFret'], 'Há casa abaixo de baseFret.');
      if (highest - baseFret + 1 > MAX_FRET_SPAN) {
        fail(['baseFret'], `As casas devem caber em ${MAX_FRET_SPAN} casas a partir de baseFret.`);
      }
      if (baseFret > 1 && lowest !== baseFret) {
        fail(['baseFret'], 'Em posição alta, baseFret deve ser a menor casa usada.');
      }
    } else if (baseFret !== 1) {
      fail(['baseFret'], 'Sem casas pressionadas, baseFret deve ser 1.');
    }

    frets.forEach((fret, index) => {
      const finger = fingers[index] ?? 0;
      const covered =
        barre !== undefined &&
        stringAt(index) <= barre.fromString &&
        stringAt(index) >= barre.toString;
      if (fret <= 0 && finger !== 0) {
        fail(['fingers', index], `Corda ${stringAt(index)} muda ou solta não pode ter dedo.`);
      }
      if (fret >= 1 && finger === 0) {
        fail(['fingers', index], `Corda ${stringAt(index)} está pressionada e precisa de dedo.`);
      }
      if (covered && fret < barre.fret) {
        fail(
          ['frets', index],
          `Corda ${stringAt(index)} está sob a pestana e não pode ficar abaixo dela.`,
        );
      }
      if (covered && fret === barre.fret && finger !== barre.finger) {
        fail(
          ['fingers', index],
          `Corda ${stringAt(index)} está na pestana; o dedo deve ser ${barre.finger}.`,
        );
      }
    });

    const fretByFinger = new Map<number, Set<number>>();
    const stringsByFinger = new Map<number, number>();
    frets.forEach((fret, index) => {
      const finger = fingers[index] ?? 0;
      if (finger === 0 || fret < 1) return;
      fretByFinger.set(finger, (fretByFinger.get(finger) ?? new Set<number>()).add(fret));
      stringsByFinger.set(finger, (stringsByFinger.get(finger) ?? 0) + 1);
    });
    for (const [finger, set] of fretByFinger) {
      if (set.size > 1) fail(['fingers'], `O dedo ${finger} não pode estar em duas casas.`);
      if ((stringsByFinger.get(finger) ?? 0) > 1 && barre?.finger !== finger) {
        fail(['fingers'], `O dedo ${finger} cobre várias cordas, então precisa de pestana.`);
      }
    }

    if (barre !== undefined) {
      if (barre.fromString <= barre.toString) {
        fail(['barre'], 'Use fromString > toString (da corda grave para a aguda), com 2+ cordas.');
      } else {
        const ends = [barre.fromString, barre.toString];
        for (const end of ends) {
          if (frets[STRING_COUNT - end] !== barre.fret) {
            fail(
              ['barre'],
              `As pontas da pestana (cordas ${ends.join(' e ')}) devem estar na casa ${barre.fret}.`,
            );
            break;
          }
        }
      }
      if (pressed.length > 0 && Math.min(...pressed) !== barre.fret) {
        fail(['barre', 'fret'], 'A pestana deve estar na menor casa pressionada.');
      }
    }
  });

export type Barre = z.infer<typeof BarreSchema>;
export type ChordShape = z.infer<typeof ChordShapeSchema>;
