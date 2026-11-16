import type { Lesson } from '@cifrai/content';

/** Lição de DESENVOLVIMENTO. Só entra por import dinâmico sob `import.meta.env.DEV`. */
const mc = (
  n: number,
  prompt: string,
  options: [string, string, string],
  correct: 0 | 1 | 2,
  explanation: string,
): Lesson['exercises'][number] => ({
  id: `u99.l01.e${String(n).padStart(2, '0')}`,
  type: 'multiple_choice',
  prompt,
  options: options.map((text, i) => ({ id: `o${i + 1}`, text })),
  correctOptionId: `o${correct + 1}`,
  explanation,
});

export const devLesson: Lesson = {
  id: 'u99.l01',
  title: 'Conhecendo o violão',
  objective: 'Reconhecer as cordas e as partes do violão.',
  category: 'concept',
  status: 'active',
  xp: 20,
  exerciseCount: 5,
  prerequisites: [],
  exercises: [
    mc(1, 'Quantas cordas tem o violão?', ['4', '6', '8'], 1, 'O violão comum tem 6 cordas.'),
    mc(
      2,
      'Qual é a corda mais fina?',
      ['Mi aguda (1ª)', 'Lá (5ª)', 'Mi grave (6ª)'],
      0,
      'A 1ª corda, Mi aguda, é a mais fina e fica embaixo, mais perto do chão.',
    ),
    mc(
      3,
      'Qual mão aperta as casas no braço de quem é destro?',
      ['A direita', 'A esquerda', 'Tanto faz'],
      1,
      'Quem é destro aperta as casas com a mão esquerda e toca as cordas com a direita.',
    ),
    {
      id: 'u99.l01.e04',
      type: 'build_chord',
      prompt: 'Monte o acorde de Mi menor.',
      chordId: 'em',
      explanation: 'Exercício de tipo ainda não suportado: usado para testar o fallback.',
    },
    mc(
      5,
      'Quantos minutos de prática por dia ajudam no começo?',
      ['5 a 15', '120', 'Nenhum'],
      0,
      'Sessões curtas e frequentes funcionam melhor. Pare se sentir dor nos pulsos ou dedos.',
    ),
  ],
};
