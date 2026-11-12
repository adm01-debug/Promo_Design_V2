# Quality Gate — CI Pipeline

Todo pull request passa por um **quality gate** com jobs paralelos e
independentes. Cada job aparece como um _status check_ no PR e falha
isoladamente — nada é escondido atrás de um step sequencial.

## Gates executados em cada PR

| Job                | Comando                                  | Bloqueia merge? |
| ------------------ | ---------------------------------------- | --------------- |
| **Typecheck**      | `tsc --noEmit -p tsconfig.app.json`      | ✅ sim          |
| **Lint**           | `eslint . --max-warnings=0`              | ✅ sim          |
| **Format**         | `prettier --check`                       | ✅ sim          |
| **Tests (Vitest)** | `vitest run` (+ JUnit report)            | ✅ sim          |
| **Build (Vite)**   | `vite build`                             | ✅ sim          |
| **Edge (Deno)**    | `deno test` para `_shared` + `*_test.ts` | ✅ sim          |
| **Quality Gate**   | Agrega os 6 acima em um único check      | ✅ sim          |

Suites pesadas (**load tests**, **Playwright E2E**, **audit PDF**) rodam
apenas em `push` para `main`/`master` — não bloqueiam revisões e usam
secrets do repositório.

## Configurando proteção de branch

Para que o gate seja obrigatório, configure em
`Settings → Branches → Branch protection rules` do repositório GitHub:

1. Adicione uma regra para `main` (e `master`, se aplicável).
2. Habilite **Require status checks to pass before merging**.
3. Habilite **Require branches to be up to date before merging**.
4. Marque como obrigatório o check **`Quality Gate`**
   (ele já depende de todos os demais internamente; basta um único check
   obrigatório para bloquear regressões em qualquer gate).
5. (Opcional) Habilite **Require conversation resolution**,
   **Require signed commits** e **Include administrators**.

## Cancelamento de runs obsoletos

O workflow usa `concurrency: quality-gate-${{ github.ref }}` com
`cancel-in-progress: true`, então um novo push no PR cancela o run
anterior automaticamente — o resultado no PR é sempre o do último commit.

## Rodando localmente antes de abrir o PR

```bash
npx tsc --noEmit -p tsconfig.app.json    # typecheck
npm run lint                              # eslint
npm run format:check                      # prettier
npm test                                  # vitest
npm run build                             # vite build
deno test --allow-net --allow-env --allow-read supabase/functions/_shared
```
