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
  exerciseCount: 10,
  safetyNotice: 'Faça pausas curtas. Se sentir dor nos pulsos ou dedos, pare e descanse.',
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
      explanation: 'Mi menor: dedos 2 e 3 nas cordas 5 e 4, casa 2; as demais cordas soltas.',
    },
    mc(
      5,
      'Quantos minutos de prática por dia ajudam no começo?',
      ['5 a 15', '120', 'Nenhum'],
      0,
      'Sessões curtas e frequentes funcionam melhor. Pare se sentir dor nos pulsos ou dedos.',
    ),
    {
      id: 'u99.l01.e06',
      type: 'multiple_choice',
      prompt: 'Qual acorde é este? Toque no diagrama para ouvir.',
      chordId: 'am',
      chordPresentation: 'diagram',
      options: [
        { id: 'o1', text: 'Em (Mi menor)' },
        { id: 'o2', text: 'Am (Lá menor)' },
        { id: 'o3', text: 'C (Dó maior)' },
      ],
      correctOptionId: 'o2',
      explanation: 'A corda 6 fica muda (X) e os dedos 1, 2 e 3 formam o Lá menor.',
    },
    {
      id: 'u99.l01.e07',
      type: 'multiple_choice',
      prompt: 'Ouça o acorde. Ele soa mais triste ou mais alegre?',
      chordId: 'am',
      chordPresentation: 'audio_only',
      options: [
        { id: 'o1', text: 'Maior (soa mais alegre)' },
        { id: 'o2', text: 'Menor (soa mais triste)' },
      ],
      correctOptionId: 'o2',
      explanation: 'Os acordes menores soam mais sombrios. Esse é o Lá menor.',
    },
    {
      id: 'u99.l01.e08',
      type: 'match_pairs',
      prompt: 'Ligue cada nota ao nome em cifra.',
      pairs: [
        { left: 'Lá', right: 'A' },
        { left: 'Mi', right: 'E' },
        { left: 'Sol', right: 'G' },
      ],
      explanation:
        'Na cifra, as notas viram letras: Lá = A, Si = B, Dó = C, Ré = D, Mi = E, Fá = F, Sol = G.',
    },
    {
      id: 'u99.l01.e09',
      type: 'order',
      prompt: 'Coloque as cordas na ordem, da mais grave (6ª) para a mais aguda (1ª).',
      items: ['Mi grave (6ª)', 'Lá (5ª)', 'Ré (4ª)', 'Sol (3ª)', 'Si (2ª)', 'Mi agudo (1ª)'],
      explanation: 'As cordas vão de Mi grave a Mi agudo: Mi, Lá, Ré, Sol, Si, Mi.',
    },
    {
      id: 'u99.l01.e10',
      type: 'practice_timer',
      prompt: 'Pratique no violão: troque entre Em e Am por 30 segundos.',
      durationSeconds: 30,
      explanation:
        'Trocar de acorde devagar e sem tensão treina os dedos mais do que trocar rápido.',
    },
  ],
};
