

## Retry de uploads que falharam

No `AssetUploadDialog`, hoje quando algum arquivo falha no upload em lote, o usuário precisa fechar o diálogo e recomeçar do zero. Vou adicionar um botão "Tentar novamente" que reenvia apenas as entradas com `status: "error"`.

### Mudanças

**`src/features/dam/components/AssetUploadDialog.tsx`**

- Após o `handleSubmit` atual terminar, se houver pelo menos um `entry.status === "error"`, **não fechar o diálogo** mesmo que `okCount > 0`. Em vez disso:
  - Manter as entradas `done` visíveis com badge "ok"
  - Manter as entradas `error` visíveis com badge "erro" + tooltip do `entry.error`
  - Mostrar resumo no rodapé: "X enviado(s) · Y com erro"
- Extrair a lógica de upload para uma função `uploadEntries(targets: FileEntry[])` reutilizável
- Adicionar novo handler `handleRetry()`:
  - Filtra entradas com `status === "error"`
  - Reseta cada uma para `status: "pending"` e `error: undefined`
  - Chama `uploadEntries(failedOnly)` — usa as MESMAS opções (clientId, assetType, tags, parentAsset) do envio original
- Adicionar botão **"Tentar novamente (N)"** no `DialogFooter`:
  - Aparece apenas quando há entradas em erro e não está uploading
  - Variante `outline`, ícone `RotateCw` da lucide
  - Mostra contador de falhas
- Botão "Enviar" muda para "Concluir" quando todas as entradas estão `done` (apenas fecha o diálogo)
- Botão "Cancelar" continua disponível; se houver `done`, ele já invocou `onUploaded` para o último — manter comportamento
- Permitir remover individualmente entradas em erro (a lixeira já existe quando `status !== "done"`, então funciona)

**Sem mudanças** em hooks, banco, RLS ou outros componentes.

### Critérios de aceite

- Upload em lote com 5 arquivos onde 2 falham → diálogo permanece aberto mostrando 3 ✓ e 2 ✗
- Botão "Tentar novamente (2)" aparece no rodapé com ícone de refresh
- Clicar em retry reenvia apenas os 2 que falharam, mantendo os 3 já concluídos intactos (sem reupload)
- Se o retry sucede em todos, botão muda para "Concluir" e ao clicar fecha o diálogo
- Se o retry falha de novo, contador atualiza ("Tentar novamente (1)") e mensagem de erro do toast aparece
- Usuário pode remover manualmente uma entrada em erro com o X antes de retry
- Modo versão (1 arquivo) também respeita: se falhar, mostra retry; se suceder no retry, fecha
- `onUploaded` é chamado para cada novo asset criado (incluindo os do retry)
- Sem regressão: fluxo de sucesso total continua fechando o diálogo automaticamente

