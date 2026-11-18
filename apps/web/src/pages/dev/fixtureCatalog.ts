import type { CatalogLesson, CatalogUnit } from '../../path/catalog';

/** Catálogo de DESENVOLVIMENTO. Só entra por import dinâmico sob `import.meta.env.DEV`. */
const lesson = (
  id: string,
  title: string,
  objective: string,
  xp: number,
  extra: Partial<CatalogLesson> = {},
): CatalogLesson => ({
  id,
  title,
  objective,
  category: 'concept',
  status: 'active',
  xp,
  exerciseCount: 11,
  prerequisites: [],
  ...extra,
});

export const devCatalog: CatalogUnit[] = [
  {
    id: 'u99',
    title: 'Conhecendo o violão',
    description: 'As partes do violão, as cordas e como segurar o instrumento.',
    lessons: [
      lesson('u99.l01', 'Conhecendo o violão', 'Reconhecer as cordas e as partes do violão.', 20),
      lesson(
        'u99.l02',
        'As seis cordas',
        'Nomear as cordas do violão, da mais grave à mais aguda.',
        20,
        {
          prerequisites: ['u99.l01'],
        },
      ),
      lesson('u99.l03', 'Postura e pulso', 'Sentar com conforto e proteger pulsos e dedos.', 15, {
        category: 'technique',
      }),
      lesson('u99.l99', 'Lição antiga (aposentada)', 'Aposentada: não aparece na trilha.', 20, {
        status: 'retired',
      }),
    ],
  },
  {
    id: 'u98',
    title: 'Primeiros acordes',
    description: 'Mi menor, Lá menor e Dó maior, do jeito mais simples.',
    lessons: [
      lesson('u98.l01', 'Mi menor', 'Montar o acorde de Mi menor.', 25),
      lesson('u98.l02', 'Lá menor', 'Montar o acorde de Lá menor.', 25),
      lesson('u98.l03', 'Dó maior', 'Montar o acorde de Dó maior.', 25),
      lesson('u98.l04', 'Trocando de acorde', 'Alternar entre dois acordes sem pressa.', 30),
    ],
  },
  {
    id: 'u97',
    title: 'Ritmo e primeira música',
    description: 'Batida básica e uma progressão simples para tocar junto.',
    lessons: [
      lesson('u97.l01', 'Batida em quatro tempos', 'Marcar o pulso com a mão direita.', 25),
      lesson('u97.l02', 'Progressão Em, Am, C', 'Tocar a sequência no pulso.', 30),
    ],
  },
];
