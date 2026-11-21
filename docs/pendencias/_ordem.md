# Ordem de Execucao do Backlog

Prioridade por impacto no negocio e dependencia, validada no baseline 246e410c.

## Bloqueios do dono (nao sao BR)

- [DONO] Rotacionar service_role + reset senha postgres (Dashboard fygxlswpkjtjpcefjfty) - item 19 prod-readiness.
- [DONO] Deletar edge function migrate-helper no Dashboard - responde HTTP 401 hoje.

## Sequencia executavel via PR

1. PND-06 idx notifications - 15min, impacta polling 15s, sem DDL destrutivo. Migration aditiva.
2. PND-07 deprecar overloads - 30min, remove ambiguidade em check_ai_quota/cleanup_expired_data.
3. PND-08 dashboard erros 60min - 2h, fecha lacuna de observabilidade (RPC + painel).
4. PND-02 a11y editor - acessibilidade critica (ALTO).
5. PND-03 canvas responsivo - mobile/tablet.
6. PND-04 revokeObjectURL - memoria em sessoes longas.
7. PND-01 web worker warp - ALTO, maior esforco, ultimo entre os de editor (depende de testes).
8. PND-05 undo/redo - gap de UX no editor.
9. PND-09 offline mode - lacuna enterprise.
10. PND-10 webhooks ERP - integracao externa, depende de decisao de negocio (formato/ERP).

## Iteracao contabilizada

PND-01..10 criados em 2026-11-21 a partir das 3 auditorias (docs/enterprise-audit-report.md, docs/senior-frontend-audit.md, docs/senior-backend-audit-2026-07.md) + prod-readiness.
