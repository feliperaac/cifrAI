import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, lastDays } from './dates.js';
import { computeStreak, STREAK_BACKFILL_DAYS } from './streak.js';

const days = (...dates: string[]) => dates.map((localDate) => ({ localDate }));

describe('dates', () => {
  it('soma dias atravessando mês, ano e bissexto', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-11-10', '2026-11-17')).toBe(7);
    expect(daysBetween('2026-11-17', '2026-11-10')).toBe(-7);
  });
  it('lastDays termina em hoje, em ordem crescente', () => {
    expect(lastDays('2026-11-17', 3)).toEqual(['2026-11-15', '2026-11-16', '2026-11-17']);
  });
});

describe('computeStreak', () => {
  const today = '2026-11-17';

  it('sem atividade: tudo zero', () => {
    expect(computeStreak([], today)).toMatchObject({ current: 0, best: 0, pendingToday: false });
  });

  it('dias consecutivos terminando hoje', () => {
    const r = computeStreak(days('2026-11-15', '2026-11-16', '2026-11-17'), today);
    expect(r).toMatchObject({ current: 3, best: 3, activeToday: true, pendingToday: false });
  });

  it('várias lições no mesmo dia valem um dia só', () => {
    expect(computeStreak(days('2026-11-17', '2026-11-17', '2026-11-17'), today).current).toBe(1);
  });

  it('hoje sem atividade não zera: ancora em ontem e fica pendente', () => {
    const r = computeStreak(days('2026-11-15', '2026-11-16'), today);
    expect(r).toMatchObject({ current: 2, activeToday: false, pendingToday: true });
  });

  it('um dia inteiro sem lição zera o atual e preserva o melhor', () => {
    const r = computeStreak(days('2026-11-10', '2026-11-11', '2026-11-12', '2026-11-15'), today);
    expect(r).toMatchObject({ current: 0, best: 3, pendingToday: false });
  });

  it('lacuna no meio quebra a sequência', () => {
    const r = computeStreak(days('2026-11-13', '2026-11-15', '2026-11-16', '2026-11-17'), today);
    expect(r).toMatchObject({ current: 3, best: 3 });
  });

  it('melhor sequência pode estar no passado', () => {
    const r = computeStreak(
      days('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-11-17'),
      today,
    );
    expect(r).toMatchObject({ current: 1, best: 4 });
  });

  it('ignora datas futuras (relógio adiantado)', () => {
    expect(computeStreak(days('2026-11-18', '2026-11-19'), today)).toMatchObject({
      current: 0,
      best: 0,
    });
  });

  it('evento atrasado além de 7 dias não conta; dentro da janela conta', () => {
    expect(STREAK_BACKFILL_DAYS).toBe(7);
    const late = [{ localDate: '2026-11-16', recordedOn: '2026-11-24' }];
    expect(computeStreak(late, '2026-11-24').best).toBe(0);
    const inWindow = [{ localDate: '2026-11-16', recordedOn: '2026-11-23' }];
    expect(computeStreak(inWindow, '2026-11-24').best).toBe(1);
  });

  it('janela configurável', () => {
    const e = [{ localDate: '2026-11-16', recordedOn: '2026-11-18' }];
    expect(computeStreak(e, '2026-11-18', 1).best).toBe(0);
    expect(computeStreak(e, '2026-11-18', 2).best).toBe(1);
  });

  it('é uma estimativa otimista (servidor é a autoridade)', () => {
    expect(computeStreak([], today).estimate).toBe(true);
  });
});
