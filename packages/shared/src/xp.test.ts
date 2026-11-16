import { describe, expect, it } from 'vitest';
import { buildXpLedger, DAILY_XP_CAP, REPEAT_XP_RATE, type XpLedgerInput } from './xp.js';

let seq = 0;
function input(
  over: { id?: string; lessonId?: string; ts?: string; tz?: string; xp?: number } = {},
): XpLedgerInput {
  seq += 1;
  return {
    lessonXp: over.xp ?? 20,
    event: {
      eventId: over.id ?? `evt-${seq}`,
      deviceId: 'dev-1',
      clientSeq: seq,
      clientTs: over.ts ?? '2026-11-15T15:00:00.000Z',
      clientTz: over.tz ?? 'America/Rio_Branco',
      payload: {
        lessonId: over.lessonId ?? 'u01.l01',
        exercisesTotal: 5,
        exercisesCorrect: 5,
        durationSeconds: 100,
      },
    },
  };
}

describe('buildXpLedger (estimativa otimista, regras propostas no ADR-0002)', () => {
  it('sem eventos: total zero', () => {
    expect(buildXpLedger([])).toEqual({ entries: [], total: 0, byDay: {} });
  });

  it('primeira conclusão do dia rende o XP cheio da lição', () => {
    const ledger = buildXpLedger([input()]);
    expect(ledger.total).toBe(20);
    expect(ledger.entries[0]?.reason).toBe('full');
  });

  it('repetição no mesmo dia rende 20% (arredondado para baixo)', () => {
    const ledger = buildXpLedger([input(), input({ ts: '2026-11-15T16:00:00.000Z' })]);
    expect(ledger.entries.map((e) => e.xp)).toEqual([20, Math.floor(20 * REPEAT_XP_RATE)]);
    expect(ledger.entries[1]?.reason).toBe('repeat');
    expect(ledger.total).toBe(24);
  });

  it('o mesmo dia local usa o fuso do evento: 02:00 UTC conta como o dia anterior em Rio Branco', () => {
    const ledger = buildXpLedger([
      input({ ts: '2026-11-15T20:00:00.000Z' }),
      input({ ts: '2026-11-16T02:00:00.000Z' }),
    ]);
    expect(ledger.entries[1]?.reason).toBe('repeat');
    expect(Object.keys(ledger.byDay)).toEqual(['2026-11-15']);
  });

  it('em outro dia local a lição volta a render XP cheio', () => {
    const ledger = buildXpLedger([input(), input({ ts: '2026-11-16T15:00:00.000Z' })]);
    expect(ledger.total).toBe(40);
    expect(ledger.byDay).toEqual({ '2026-11-15': 20, '2026-11-16': 20 });
  });

  it('lições diferentes no mesmo dia rendem cheio cada uma', () => {
    const ledger = buildXpLedger([input(), input({ lessonId: 'u01.l02', xp: 30 })]);
    expect(ledger.total).toBe(50);
  });

  it('aplica o teto diário e marca como capped', () => {
    const ledger = buildXpLedger([
      input({ lessonId: 'u01.l01', xp: 100 }),
      input({ lessonId: 'u01.l02', xp: 100 }),
      input({ lessonId: 'u01.l03', xp: 100 }),
      input({ lessonId: 'u01.l04', xp: 100 }),
      input({ lessonId: 'u01.l05', xp: 100 }),
      input({ lessonId: 'u01.l06', xp: 100 }),
    ]);
    expect(ledger.total).toBe(DAILY_XP_CAP);
    expect(ledger.entries[5]).toMatchObject({ xp: 0, reason: 'capped' });
  });

  it('teto parcial: só o que cabe no dia', () => {
    const ledger = buildXpLedger([input({ xp: 100 }), input({ lessonId: 'u01.l02', xp: 100 })], {
      dailyCap: 150,
    });
    expect(ledger.entries.map((e) => e.xp)).toEqual([100, 50]);
    expect(ledger.entries[1]?.reason).toBe('capped');
  });

  it('idempotente: o mesmo eventId duas vezes conta uma só', () => {
    const a = input({ id: 'same' });
    expect(buildXpLedger([a, a]).total).toBe(20);
  });

  it('é determinística, independente da ordem de entrada', () => {
    const first = input({ ts: '2026-11-15T10:00:00.000Z' });
    const second = input({ ts: '2026-11-15T11:00:00.000Z' });
    const forward = buildXpLedger([first, second]);
    const backward = buildXpLedger([second, first]);
    expect(backward).toEqual(forward);
    expect(forward.entries[0]?.reason).toBe('full');
  });

  it('XP da lição menor que 5 rende 0 na repetição (floor)', () => {
    const ledger = buildXpLedger([input({ xp: 4 }), input({ xp: 4 })]);
    expect(ledger.entries[1]?.xp).toBe(0);
  });
});
