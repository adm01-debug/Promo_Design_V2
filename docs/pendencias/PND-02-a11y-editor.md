---
ID: PND-02
Titulo: ARIA em seletor de views e toolbars do editor
Estado: DONE
Fonte: docs/senior-frontend-audit.md [ALTO]
Data: 2026-11-21
---

# PND-02 - ARIA em seletor de views e toolbars do editor

## Estado

DONE (2026-11-21)

## Fonte

docs/senior-frontend-audit.md [ALTO]

## Descricao

Componentes complexos do editor sem aria-label/aria-selected; exige aria-label em botoes de icone e tabIndex logico.

## Evidencia / Acao

Editor acessivel no head d2004c6e: EditorViewThumbnails.tsx usa aria-label + aria-pressed nos botoes de vista; EditorTopBar.tsx e EditorRightPanel.tsx usam aria-label, role/toolbar, aria-labelledby e text em vez de apenas icone. Verificado na fonte.
