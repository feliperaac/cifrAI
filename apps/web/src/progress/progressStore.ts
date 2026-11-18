import {
  DailyGoalSetEventSchema,
  LessonCompletedEventSchema,
  type DailyGoalXp,
  type XpReason,
} from '@cifrai/shared';
import { create } from 'zustand';
import { CONTENT_VERSION, DISPLAY_TIME_ZONE } from '../config';
import { createEventStore, type EventStore, type StoredRecord } from './eventStore';
import { EMPTY_SUMMARY, summarize, type ProgressSummary } from './summary';
import { newUuid } from './uuid';

export interface LessonCompletion {
  /** Gerado uma vez por execução da lição: é a chave de idempotência. */
  eventId: string;
  lesson: { id: string; xp: number };
  exercisesTotal: number;
  exercisesCorrect: number;
  durationSeconds: number;
}

export interface CompletionOutcome {
  status: 'added' | 'duplicate' | 'error';
  /** XP estimado para ESTA conclusão (0 em erro). */
  awardedXp: number;
  reason: XpReason | null;
  totalXp: number;
}

export interface ProgressDeps {
  store: EventStore;
  now: () => Date;
  timeZone: () => string;
}

export function deviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone.includes('/') || zone === 'UTC' ? zone : DISPLAY_TIME_ZONE;
  } catch {
    return DISPLAY_TIME_ZONE;
  }
}

export interface ProgressState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  persistence: EventStore['kind'];
  summary: ProgressSummary;
  load: () => Promise<void>;
  /** Grava `daily_goal.set` (vale a partir de hoje). Devolve false se não foi possível gravar. */
  setDailyGoal: (goalXp: DailyGoalXp) => Promise<boolean>;
  recordLessonCompleted: (completion: LessonCompletion) => Promise<CompletionOutcome>;
}

/** Fábrica separada do hook padrão para os testes injetarem repositório e relógio. */
export function createProgressStore(deps: ProgressDeps) {
  let loading: Promise<void> | null = null;

  const recompute = (records: StoredRecord[]) => summarize(records, deps.now(), deps.timeZone());

  return create<ProgressState>()((set, get) => ({
    status: 'idle',
    persistence: deps.store.kind,
    summary: EMPTY_SUMMARY,
    load() {
      loading ??= (async () => {
        set({ status: 'loading' });
        try {
          const records = await deps.store.list();
          set({
            status: 'ready',
            persistence: deps.store.kind,
            summary: recompute(records).summary,
          });
        } catch {
          set({ status: 'error', persistence: deps.store.kind });
        } finally {
          loading = null;
        }
      })();
      return loading;
    },
    async setDailyGoal(goalXp) {
      if (get().summary.dailyGoalXp === goalXp && get().status === 'ready') return true;
      try {
        const eventId = newUuid();
        await deps.store.append(eventId, ({ deviceId, clientSeq }) => ({
          event: DailyGoalSetEventSchema.parse({
            eventId,
            type: 'daily_goal.set',
            schemaVersion: 1,
            payload: { goalXp },
            contentVersion: CONTENT_VERSION,
            deviceId,
            clientSeq,
            clientTs: deps.now().toISOString(),
            clientTz: deps.timeZone(),
          }),
        }));
        set({
          status: 'ready',
          persistence: deps.store.kind,
          summary: recompute(await deps.store.list()).summary,
        });
        return true;
      } catch {
        set({ persistence: deps.store.kind });
        return false;
      }
    },
    async recordLessonCompleted(completion) {
      const failed = (): CompletionOutcome => ({
        status: 'error',
        awardedXp: 0,
        reason: null,
        totalXp: get().summary.totalXp,
      });
      try {
        const status = await deps.store.append(completion.eventId, ({ deviceId, clientSeq }) => ({
          lessonXp: completion.lesson.xp,
          event: LessonCompletedEventSchema.parse({
            eventId: completion.eventId,
            type: 'lesson.completed',
            schemaVersion: 1,
            payload: {
              lessonId: completion.lesson.id,
              exercisesTotal: completion.exercisesTotal,
              exercisesCorrect: completion.exercisesCorrect,
              durationSeconds: completion.durationSeconds,
            },
            contentVersion: CONTENT_VERSION,
            deviceId,
            clientSeq,
            clientTs: deps.now().toISOString(),
            clientTz: deps.timeZone(),
          }),
        }));
        const records = await deps.store.list();
        const { summary, ledger } = recompute(records);
        const entry = ledger.entries.find((e) => e.eventId === completion.eventId);
        set({ status: 'ready', persistence: deps.store.kind, summary });
        return {
          status,
          awardedXp: entry?.xp ?? 0,
          reason: entry?.reason ?? null,
          totalXp: summary.totalXp,
        };
      } catch {
        set({ persistence: deps.store.kind });
        return failed();
      }
    },
  }));
}

function defaultDeps(): ProgressDeps {
  return { store: createEventStore(), now: () => new Date(), timeZone: deviceTimeZone };
}

type ProgressStore = ReturnType<typeof createProgressStore>;
let active: ProgressStore | null = null;

function current(): ProgressStore {
  active ??= createProgressStore(defaultDeps());
  return active;
}

/** Hook com a mesma API do Zustand, apontando para o repositório ativo (criado sob demanda). */
export function useProgressStore<T>(selector: (state: ProgressState) => T): T {
  return current()(selector);
}

export function getProgressState(): ProgressState {
  return current().getState();
}

/** Troca o repositório/relógio (testes, ou um futuro EventStore com outbox). Zera o estado em memória. */
export function configureProgress(deps: Partial<ProgressDeps> = {}): void {
  active = createProgressStore({ ...defaultDeps(), ...deps });
}
