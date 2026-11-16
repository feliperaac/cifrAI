# @cifrai/content

Currículo como código: lições e exercícios em JSON, validados por Zod. Textos em pt-BR, identificadores em inglês.

## Formato

Um arquivo por unidade em `units/uNN.json` (o nome segue o ID da unidade). Hierarquia: curso (`courseId`) > unidade > lição > exercício.

| Nível     | ID               | Observação                                                      |
| --------- | ---------------- | --------------------------------------------------------------- |
| Curso     | `c01`            | `courseId` igual em todas as unidades                           |
| Unidade   | `u02`            | arquivo `u02.json`                                              |
| Lição     | `u02.l03`        | prefixo = unidade                                               |
| Exercício | `u02.l03.e01`    | prefixo = lição                                                 |

IDs são estáveis: nunca reutilize nem renumere. Para remover uma lição, troque `status` para `"retired"` (ela continua no catálogo com o mesmo XP; o ADR-0002 depende disso).

Campos da lição: `id`, `title`, `objective`, `category` (`concept|technique|chord|rhythm|song|review`), `status` (`active|retired`), `xp` (inteiro, 1 a 100), `exerciseCount` (igual ao tamanho de `exercises`), `prerequisites` (IDs de lições anteriores), `safetyNotice` (obrigatório em `technique`), `source` (obrigatório em `song`), `exercises`.

Tipos de exercício (campo `type`; todos têm `id`, `prompt`, `explanation`, `hint` opcional):

- `multiple_choice`: `options` (`{id, text}`) e `correctOptionId`. Opcionais (acorde que o aluno pode ouvir): `chordId` (do catálogo de `@cifrai/shared`) e `chordPresentation` (`diagram`, padrão: diagrama tocável com a cifra escondida até a resposta; `diagram_with_name`: nome sempre visível; `audio_only`: só o botão de ouvir, para "ouça e escolha"). `chordPresentation` exige `chordId`. Sem `chordId` o exercício é o de antes (retrocompatível).
- `match_pairs`: `pairs` (`{left, right}`).
- `order`: `items` na ordem correta (a UI embaralha).
- `build_chord`: `chordId` (ex.: `em`). O diagrama vem do catálogo de acordes em `@cifrai/shared` (`CHORD_CATALOG`), não daqui; o validador rejeita `chordId` que não esteja no catálogo.
- `practice_timer`: `durationSeconds`. Auto-avaliação "Consegui / Preciso de mais prática".

## Como criar uma lição

1. Abra (ou crie) `units/uNN.json` e acrescente a lição em `lessons`, com o próximo número livre.
2. Numere os exercícios `uNN.lNN.e01`, `e02`, ...
3. Atualize `exerciseCount` e escolha o `xp`.
4. Rode `pnpm content:validate`. Cada erro mostra `arquivo > caminho.do.campo: mensagem`.

## Regras de validação

- Formato dos IDs; ID único em todo o catálogo; ID coerente com a hierarquia e com o nome do arquivo.
- `schemaVersion` = 1; campos desconhecidos são rejeitados (`.strict()`).
- Nenhum texto vazio ou só espaços.
- XP inteiro de 1 a 100; `exerciseCount` igual ao número de exercícios (1 a 20).
- `build_chord` e `multiple_choice`: `chordId`, quando presente, existe no catálogo de acordes de `@cifrai/shared`; `chordPresentation` só com `chordId`.
- Resposta correta pertence às opções; opções, pares e itens de ordenação sem repetição.
- Pré-requisito existe e vem antes da lição.
- Direitos autorais: `source.kind` é `public-domain`, `folk` ou `original`; `folk` e `public-domain` exigem `source.reference` (onde você verificou). Chaves de letra (`lyrics`, `letra`...) são rejeitadas. Nunca inclua letra protegida.
- Segurança: lições `technique` exigem `safetyNotice` citando pausa, dor ou desconforto.
- Com zero unidades, o validador passa com aviso. Qualquer erro sai com código 1.

## Exemplo mínimo

```json
{
  "schemaVersion": 1,
  "courseId": "c01",
  "id": "u00",
  "title": "Título da unidade",
  "description": "Uma frase sobre a unidade.",
  "lessons": [
    {
      "id": "u00.l01",
      "title": "Título da lição",
      "objective": "O que a pessoa vai aprender.",
      "category": "concept",
      "status": "active",
      "xp": 10,
      "exerciseCount": 1,
      "prerequisites": [],
      "exercises": [
        {
          "id": "u00.l01.e01",
          "type": "multiple_choice",
          "prompt": "Pergunta?",
          "explanation": "Por que a resposta certa é a A.",
          "options": [
            { "id": "a", "text": "Opção A" },
            { "id": "b", "text": "Opção B" }
          ],
          "correctOptionId": "a"
        }
      ]
    }
  ]
}
```

## Comandos

```
pnpm content:validate                  # na raiz
pnpm --filter @cifrai/content test     # testes do validador (fixtures em src/__fixtures__)
```
