import { describe, expect, it } from 'vitest';
import type { CatalogLesson, CatalogUnit } from './catalog';
import { buildPath } from './pathState';

const lesson = (id: string, extra: Partial<CatalogLesson> = {}): CatalogLesson => ({
  id,
  title: id,
  objective: 'x',
  category: 'concept',
  status: 'active',
  xp: 20,
  exerciseCount: 8,
  prerequisites: [],
  ...extra,
});
const unit = (id: string, lessons: CatalogLesson[]): CatalogUnit => ({
  id,
  title: id,
  description: 'd',
  lessons,
});
const states = (units: CatalogUnit[], done: string[]) =>
  buildPath(units, new Set(done)).flatMap((u) => u.lessons.map((l) => l.state));

const units = [
  unit('u01', [lesson('u01.l01'), lesson('u01.l02')]),
  unit('u02', [lesson('u02.l01'), lesson('u02.l02')]),
];

describe('buildPath (regras de desbloqueio)', () => {
  it('sem progresso: a primeira é atual e o resto bloqueado', () => {
    expect(states(units, [])).toEqual(['current', 'locked', 'locked', 'locked']);
  });

  it('concluir abre a próxima, inclusive na unidade seguinte', () => {
    expect(states(units, ['u01.l01'])).toEqual(['done', 'current', 'locked', 'locked']);
    expect(states(units, ['u01.l01', 'u01.l02'])).toEqual(['done', 'done', 'current', 'locked']);
  });

  it('estado das unidades e contagem', () => {
    const path = buildPath(units, new Set(['u01.l01', 'u01.l02']));
    expect(path.map((u) => u.state)).toEqual(['done', 'current', 'locked'].slice(0, 2));
    expect(path[0]).toMatchObject({ done: 2, total: 2 });
    const none = buildPath(units, new Set());
    expect(none.map((u) => u.state)).toEqual(['current', 'locked']);
  });

  it('tudo concluído: ninguém atual', () => {
    expect(states(units, ['u01.l01', 'u01.l02', 'u02.l01', 'u02.l02'])).toEqual([
      'done',
      'done',
      'done',
      'done',
    ]);
  });

  it('aposentada fica oculta e não bloqueia a seguinte', () => {
    const withRetired = [
      unit('u01', [lesson('u01.l01'), lesson('u01.l02', { status: 'retired' }), lesson('u01.l03')]),
    ];
    const path = buildPath(withRetired, new Set(['u01.l01']));
    expect(path[0]?.lessons.map((l) => [l.lesson.id, l.number, l.state])).toEqual([
      ['u01.l01', 1, 'done'],
      ['u01.l03', 2, 'current'],
    ]);
  });

  it('unidade só com aposentadas some', () => {
    const only = [unit('u01', [lesson('u01.l01', { status: 'retired' })]), units[1]!];
    expect(buildPath(only, new Set()).map((u) => u.unit.id)).toEqual(['u02']);
  });

  it('prerequisites ativos pendentes trancam; desconhecidos são ignorados', () => {
    const withPrereq = [
      unit('u01', [
        lesson('u01.l01'),
        lesson('u01.l02', { prerequisites: ['u01.l03'] }),
        lesson('u01.l03'),
      ]),
    ];
    expect(states(withPrereq, ['u01.l01'])).toEqual(['done', 'locked', 'locked']);
    const unknown = [unit('u01', [lesson('u01.l01', { prerequisites: ['u77.l01'] })])];
    expect(states(unknown, [])).toEqual(['current']);
  });

  it('lição concluída continua concluída mesmo se a anterior estiver pendente', () => {
    expect(states(units, ['u01.l02'])).toEqual(['current', 'done', 'locked', 'locked']);
  });
});
