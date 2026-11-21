---
ID: PND-05
Titulo: Undo/Redo no editor de mockup
Estado: DONE
Fonte: docs/senior-frontend-audit.md [gap]
Data: 2026-11-21
---

# PND-05 - Undo/Redo no editor de mockup

## Estado

DONE (2026-11-21)

## Fonte

docs/senior-frontend-audit.md [gap]

## Descricao

Operacoes de design sao destrutivas; implementar historico (Memento/Command).

## Evidencia / Acao

Undo/Redo implementado no head d2004c6e: use-mockup-editor-state.ts (undo/redo/undoLogo/redoLogo L138-236), use-mockup-editor.ts (L161-169) com atalhos Ctrl+Z/Ctrl+Shift+Z/Ctrl+Y e testes em use-mockup-editor-shortcuts.test.ts. Verificado na fonte.
