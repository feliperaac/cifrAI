import { fileURLToPath } from 'node:url';
import { validateUnitsDir } from './validate.js';

const unitsDir = fileURLToPath(new URL('../units', import.meta.url));
const result = validateUnitsDir(unitsDir);

for (const warning of result.warnings) console.warn(`AVISO: ${warning}`);

if (!result.ok) {
  for (const issue of result.issues) {
    const where = issue.path === '' ? issue.file : `${issue.file} > ${issue.path}`;
    console.error(`ERRO ${where}: ${issue.message}`);
  }
  console.error(`\ncontent:validate FALHOU com ${result.issues.length} erro(s).`);
  process.exit(1);
}

const s = result.summary;
console.log(
  `content:validate OK: ${s.units} unidade(s), ${s.lessons} lição(ões) ` +
    `(${s.activeLessons} ativas, ${s.retiredLessons} aposentadas), ${s.exercises} exercício(s), XP total ${s.totalXp}`,
);
