import { describe, expect, it } from 'vitest';
import { formatDisplayDate } from './format';
import { summarize } from './summary';

describe('summarize', () => {
  it('sem registros: zeros', () => {
    expect(summarize([], new Date('2026-11-15T12:00:00Z'), 'UTC').summary).toMatchObject({
      totalXp: 0,
      todayXp: 0,
      lessonsCompleted: 0,
      lastCompletedAt: null,
      today: '2026-11-15',
      dailyGoalXp: 20,
      goalMetToday: false,
      completedLessonIds: [],
      streak: { current: 0, best: 0 },
    });
  });
});

describe('formatDisplayDate', () => {
  it('formata em America/Rio_Branco (UTC-5), não em UTC', () => {
    expect(formatDisplayDate('2026-11-16T02:00:00.000Z')).toBe('15/11/2026');
    expect(formatDisplayDate('2026-11-16T05:00:00.000Z')).toBe('16/11/2026');
  });
});
