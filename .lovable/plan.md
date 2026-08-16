# migrate-helper: exportador seguro para migração entre projetos

O código colado hoje entrega a chave de administração do banco (service role) e a URL de conexão para qualquer um que descubra a chave escrita no próprio arquivo. Isso não será implementado. No lugar disso, a função vira um **exportador de dados autenticado por segredo do servidor**, que é o suficiente para migrar schema/dados para outro projeto sem entregar as credenciais.

## O que muda

1. **Segredo fora do código**
   - A chave deixa de ficar escrita no arquivo e passa a ser um segredo do backend (`MIGRATE_HELPER_KEY`), gerado aleatoriamente.
   - Comparação em tempo constante, para não vazar a chave por medição de tempo.
   - Se o segredo não estiver configurado, a função responde 503 (nunca "aberta por acidente").

2. **CORS restrito**
   - Passa a usar o helper compartilhado do projeto (mesma lista de origens já usada nas outras funções), em vez de `*`.
   - Métodos: `GET, POST, OPTIONS`; header extra `x-access-key`.

3. **Ações disponíveis**
   - `ping` — status, hora do servidor (ISO) e versão da função. Sem dados sensíveis, sem URL do projeto.
   - `schema` — lista tabelas do schema público com colunas, tipos, nulidade e defaults, mais chaves primárias/estrangeiras e enums. Serve para recriar a estrutura no projeto destino.
   - `export` — exporta linhas de **uma** tabela por chamada, com paginação (`table`, `limit` máx. 1000, `offset`), ordenada de forma estável. Só tabelas da lista permitida (as tabelas de negócio do schema público); qualquer outro nome retorna 400.
   - `count` — total de linhas de uma tabela permitida, para acompanhar o progresso da migração.

4. **Proteções operacionais**
   - Validação de entrada com Zod (ação, nome de tabela, limit/offset) e 400 com mensagem clara.
   - Nada de SQL vindo do cliente: a leitura usa o cliente tipado, com nome de tabela validado contra a lista permitida.
   - Toda chamada bem-sucedida registra um evento de auditoria (ação, tabela, quantidade de linhas) para rastreabilidade.
   - Respostas de erro sempre com CORS e sem detalhes internos.

5. **Descarte**
   - Cabeçalho do arquivo documenta que é temporária e como desativar: apagar o segredo `MIGRATE_HELPER_KEY` derruba o acesso na hora (503), sem precisar de deploy.

## Detalhes técnicos

- Arquivo: `supabase/functions/migrate-helper/index.ts` (reescrita completa).
- Imports: `getCorsHeaders`/`corsPreflight` de `../_shared/cors.ts`; `createClient` via `npm:@supabase/supabase-js@2`; `zod` via `npm:`.
- Cliente com service role apenas **dentro** da função (nunca retornado no corpo da resposta).
- Ação `schema` lê `information_schema` por meio de uma função de banco `SECURITY DEFINER` dedicada (`export_public_schema()`), com `EXECUTE` concedido somente a `service_role` — sem SQL arbitrário.
- Lista permitida de tabelas fixada em constante no arquivo, derivada do schema atual (clientes, contatos, pedidos de serviço, ativos, catálogo, vídeos, organizações e membros, etc.), excluindo partições de auditoria e tabelas de telemetria.
- Segredo criado via ferramenta de secrets; nenhum valor de segredo aparece no código nem em logs.

## Fora do escopo

- Retornar service role key, senha ou URL do banco por HTTP — não será feito em nenhuma variação.
- Escrita/importação de dados no projeto destino por esta função (ela é somente leitura).
