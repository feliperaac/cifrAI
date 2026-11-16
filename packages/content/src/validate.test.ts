import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateUnitFiles, validateUnitsDir, type ContentIssue } from './index.js';

const FIXTURE = new URL('./__fixtures__/valid-unit.json', import.meta.url);

function fixture(): unknown {
  return JSON.parse(readFileSync(FIXTURE, 'utf8')) as unknown;
}

/** Edita uma cópia do fixture por caminho "lessons.0.xp"; `undefined` remove a chave. */
function edited(path: string, value: unknown, base: unknown = fixture()): unknown {
  const parts = path.split('.');
  const last = parts.pop() as string;
  let node = base as Record<string, unknown>;
  for (const part of parts) node = node[part] as Record<string, unknown>;
  if (value === undefined) delete node[last];
  else node[last] = value;
  return base;
}

function run(data: unknown, file = 'u90.json'): ContentIssue[] {
  return validateUnitFiles([{ file, data }]).issues;
}

function expectIssue(data: unknown, path: string, fragment: string, file = 'u90.json'): void {
  const issues = run(data, file);
  expect(issues.some((i) => i.path === path && i.message.includes(fragment))).toBe(true);
}

describe('catálogo válido', () => {
  it('passa e resume unidades, lições, exercícios e XP', () => {
    const result = validateUnitFiles([{ file: 'u90.json', data: fixture() }]);
    expect(result.issues).toEqual([]);
    expect(result.summary).toEqual({
      units: 1,
      lessons: 3,
      activeLessons: 2,
      retiredLessons: 1,
      exercises: 6,
      totalXp: 45,
    });
    expect(result.catalog.find((e) => e.id === 'u90.l03')).toMatchObject({
      status: 'retired',
      xp: 20,
      exerciseCount: 1,
    });
    expect(result.course?.units).toHaveLength(1);
  });

  it('zero unidades passa com aviso explícito', () => {
    const result = validateUnitFiles([]);
    expect(result.ok).toBe(true);
    expect(result.warnings[0]).toContain('Nenhuma unidade');
  });

  it('diretório inexistente conta como zero unidades', () => {
    const result = validateUnitsDir(join(tmpdir(), 'cifrai-nao-existe-xyz'));
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });
});

describe('IDs e hierarquia', () => {
  it('rejeita formato de ID inválido', () => {
    expectIssue(
      edited('lessons.0.exercises.0.id', 'u90.l01.e1'),
      'lessons[0].exercises[0].id',
      'ID inválido',
    );
  });
  it('rejeita exercício fora da lição (e02 dentro de l03 em vez de l01)', () => {
    expectIssue(
      edited('lessons.0.exercises.1.id', 'u90.l02.e09'),
      'lessons[0].exercises[1].id',
      'não pertence à lição',
    );
  });
  it('rejeita lição fora da unidade', () => {
    expectIssue(edited('lessons.0.id', 'u91.l01'), 'lessons[0].id', 'não pertence à unidade');
  });
  it('rejeita arquivo com nome diferente do ID da unidade', () => {
    expectIssue(fixture(), 'id', 'deve se chamar "u90.json"', 'u00.json');
  });
  it('rejeita ID de exercício repetido na lição', () => {
    expectIssue(
      edited('lessons.0.exercises.1.id', 'u90.l01.e01'),
      'lessons[0].exercises[1].id',
      'ID repetido',
    );
  });
  it('rejeita IDs repetidos entre arquivos', () => {
    const other = edited('id', 'u91');
    const issues = validateUnitFiles([
      { file: 'u90.json', data: fixture() },
      { file: 'u91.json', data: other },
    ]).issues;
    expect(issues.some((i) => i.message.includes('ID repetido'))).toBe(true);
  });
  it('rejeita courseId diferente entre unidades', () => {
    const other = edited('courseId', 'c02', edited('id', 'u91'));
    const issues = validateUnitFiles([
      { file: 'u90.json', data: fixture() },
      { file: 'u91.json', data: other },
    ]).issues;
    expect(issues.some((i) => i.path === 'courseId')).toBe(true);
  });
  it('rejeita pré-requisito inexistente, próprio ou futuro', () => {
    expectIssue(
      edited('lessons.1.prerequisites', ['u90.l09']),
      'lessons[1].prerequisites[0]',
      'não existe',
    );
    expectIssue(
      edited('lessons.1.prerequisites', ['u90.l02']),
      'lessons[1].prerequisites[0]',
      'deve vir antes',
    );
    expectIssue(
      edited('lessons.0.prerequisites', ['u90.l03']),
      'lessons[0].prerequisites[0]',
      'deve vir antes',
    );
  });
});

describe('metadados da lição', () => {
  it('rejeita XP zero, negativo, fracionário e acima do teto', () => {
    for (const xp of [0, -5, 1.5, 101]) {
      expect(run(edited('lessons.0.xp', xp)).some((i) => i.path === 'lessons[0].xp')).toBe(true);
    }
  });
  it('rejeita exerciseCount inconsistente', () => {
    expectIssue(
      edited('lessons.0.exerciseCount', 5),
      'lessons[0].exerciseCount',
      'tem 3 exercícios',
    );
  });
  it('rejeita status desconhecido', () => {
    expectIssue(edited('lessons.0.status', 'removed'), 'lessons[0].status', 'Invalid');
  });
  it('exige schemaVersion 1', () => {
    expect(run(edited('schemaVersion', 2)).some((i) => i.path === 'schemaVersion')).toBe(true);
  });
});

describe('regras dos exercícios', () => {
  it('resposta correta fora das opções', () => {
    expectIssue(
      edited('lessons.0.exercises.0.correctOptionId', 'z'),
      'lessons[0].exercises[0].correctOptionId',
      'não está entre as opções',
    );
  });
  it('opções com texto repetido', () => {
    expectIssue(
      edited('lessons.0.exercises.0.options.1.text', ' opção a '),
      'lessons[0].exercises[0].options',
      'texto repetido',
    );
  });
  it('pares duplicados', () => {
    expectIssue(
      edited('lessons.0.exercises.1.pairs.1.left', 'UM'),
      'lessons[0].exercises[1].pairs',
      'esquerda',
    );
    expectIssue(
      edited('lessons.0.exercises.1.pairs.1.right', '1'),
      'lessons[0].exercises[1].pairs',
      'direita',
    );
  });
  it('ordenação com itens repetidos', () => {
    expectIssue(
      edited('lessons.0.exercises.2.items', ['a', 'b', 'a']),
      'lessons[0].exercises[2].items',
      'repetidos',
    );
  });
  it('chordId fora do padrão', () => {
    expectIssue(
      edited('lessons.1.exercises.0.chordId', 'Em Maior'),
      'lessons[1].exercises[0].chordId',
      'ID inválido',
    );
  });
  it('build_chord não aceita diagrama embutido (strict)', () => {
    const issues = run(edited('lessons.1.exercises.0.frets', [0, 2, 2, 0, 0, 0]));
    expect(issues.some((i) => i.path === 'lessons[1].exercises[0]')).toBe(true);
  });
  it('tipo de exercício desconhecido', () => {
    expect(run(edited('lessons.0.exercises.0.type', 'drag')).length).toBeGreaterThan(0);
  });
  it('texto vazio ou só espaços', () => {
    expectIssue(
      edited('lessons.0.exercises.0.prompt', ''),
      'lessons[0].exercises[0].prompt',
      'vazio',
    );
    expectIssue(
      edited('lessons.0.exercises.0.explanation', '   '),
      'lessons[0].exercises[0].explanation',
      'vazio',
    );
    expectIssue(edited('lessons.0.title', ' \n'), 'lessons[0].title', 'vazio');
    expectIssue(
      edited('lessons.0.exercises.2.items.0', ' '),
      'lessons[0].exercises[2].items[0]',
      'vazio',
    );
  });
  it('duração do timer fora do intervalo', () => {
    expect(
      run(edited('lessons.1.exercises.1.durationSeconds', 5)).some(
        (i) => i.path === 'lessons[1].exercises[1].durationSeconds',
      ),
    ).toBe(true);
  });
});

describe('direitos autorais e segurança', () => {
  it('rejeita chaves de letra em qualquer nível', () => {
    expectIssue(edited('lessons.2.lyrics', 'texto'), 'lessons[2].lyrics', 'Letra de música');
    expectIssue(
      edited('lessons.2.source.letra', 'texto'),
      'lessons[2].source.letra',
      'Letra de música',
    );
    expectIssue(
      edited('lessons.2.exercises.0.lyrics', 'texto'),
      'lessons[2].exercises[0].lyrics',
      'Letra',
    );
  });
  it('lição de música exige source', () => {
    expectIssue(edited('lessons.2.source', undefined), 'lessons[2].source', 'exigem source');
  });
  it('folk e public-domain exigem a fonte verificada; kind inválido é rejeitado', () => {
    const folk = edited('lessons.2.source', { kind: 'folk', title: 'Cantiga de teste' });
    expectIssue(folk, 'lessons[2].source.reference', 'fonte verificada');
    expect(
      run(edited('lessons.2.source', { kind: 'folk', title: 'Cantiga', reference: 'Acervo X' })),
    ).toEqual([]);
    expect(run(edited('lessons.2.source.kind', 'commercial')).length).toBeGreaterThan(0);
  });
  it('técnica exige safetyNotice', () => {
    expectIssue(
      edited('lessons.1.safetyNotice', undefined),
      'lessons[1].safetyNotice',
      'exigem safetyNotice',
    );
  });
  it('safetyNotice deve mencionar pausa, dor ou desconforto', () => {
    expectIssue(
      edited('lessons.1.safetyNotice', 'Divirta-se bastante.'),
      'lessons[1].safetyNotice',
      'pausa, dor ou desconforto',
    );
  });
});

describe('carga de arquivos', () => {
  it('JSON quebrado e nome inválido apontam o arquivo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cifrai-content-'));
    try {
      writeFileSync(join(dir, 'u01.json'), '{ quebrado');
      writeFileSync(join(dir, 'x.json'), '{}');
      const result = validateUnitsDir(dir);
      expect(result.ok).toBe(false);
      expect(result.issues.map((i) => i.file).sort()).toEqual(['u01.json', 'x.json']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
