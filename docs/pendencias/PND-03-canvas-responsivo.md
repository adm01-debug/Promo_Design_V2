---
ID: PND-03
Titulo: Canvas responsivo (aspect-ratio + ResizeObserver)
Estado: DONE
Fonte: docs/senior-frontend-audit.md [MEDIO]
Data: 2026-11-21
---

# PND-03 - Canvas responsivo (aspect-ratio + ResizeObserver)

## Estado

DONE (2026-11-21)

## Fonte

docs/senior-frontend-audit.md [MEDIO]

## Descricao

CANVAS_SIZE=460 causa overflow em telas pequenas; usar container responsivo com aspect-ratio.

## Evidencia / Acao

Canvas responsivo no head d2004c6e: MockupCanvas.tsx usa ResizeObserver e displayScale = min(1, available/CANVAS_SIZE) com espacamento pad 48, ajustando o canvas fixo ao container (aspect-ratio preservado pelo canvas). Verificado na fonte.
