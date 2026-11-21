---
ID: PND-01
Titulo: Migrar warp/export para Web Worker
Estado: DONE
Fonte: docs/senior-frontend-audit.md [ALTO]
Data: 2026-11-21
---

# PND-01 - Migrar warp/export para Web Worker

## Estado

DONE (2026-11-21)

## Fonte

docs/senior-frontend-audit.md [ALTO]

## Descricao

Operacoes sincronas de Canvas e warping no MockupEditor travam a UI com logos >4000px; mover processamento para Web Worker.

## Evidencia / Acao

Web Worker implementado e em uso no head `d2004c6e`: `src/features/mockup/lib/mesh-warp.ts` (L315-342) cria `new Worker(new URL("./warp-worker.ts", import.meta.url), { type: "module" })` e exporta `getWarpedPreviewWorker` com cache; o hook `src/features/mockup/hooks/use-mockup-warp-effect.ts` importa `getWarpedPreviewWorker as getWarpedPreview`, chama na L76 com debounce de 150ms (L107). Processamento pesado fora da main thread — travamento de UI mitigado.
