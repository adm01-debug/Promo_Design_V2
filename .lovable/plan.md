

## Lazy-load de signed URLs nas thumbs do strip

Hoje `PreviewThumbStrip` renderiza um `AssetThumbnail` para **cada** asset retornado (até 50 por página). Cada `AssetThumbnail` chama `getAssetSignedUrl` no `useEffect` de montagem — ou seja, ao abrir a preview com 50 resultados, disparamos 50 requisições `createSignedUrl` mesmo que só ~6-8 thumbs estejam visíveis no strip horizontal.

O cache em `asset-urls.ts` ajuda em re-aberturas, mas a **primeira** carga ainda paga o custo. Vamos carregar a URL apenas quando a thumb entrar no viewport (ou for a ativa).

### Mudanças

**`src/features/dam/components/AssetThumbnail.tsx`**
- Adicionar prop opcional `eager?: boolean` (default `false`).
- Quando `eager === false`: usar `IntersectionObserver` num `ref` do container; só chamar `getAssetSignedUrl` quando `isIntersecting` virar `true` pela primeira vez. Depois disso, manter a URL (não recarregar ao sair do viewport).
- Quando `eager === true`: comportamento atual (carrega no mount) — usado para o asset ativo da stage e qualquer caso onde queremos pré-carregar.
- Fallback gracioso: se `IntersectionObserver` indisponível (SSR/jsdom), tratar como `eager`.
- Manter o placeholder `ImageIcon animate-pulse` enquanto não há URL (vale tanto para "ainda não visível" quanto "visível, carregando").
- Cleanup do observer no unmount.

**`src/features/dam/components/PreviewThumbStrip.tsx`**
- Passar `eager={i === activeIndex}` para `AssetThumbnail`, garantindo que a thumb ativa carrega imediatamente mesmo se estiver fora do viewport inicial (raro, mas possível após `scrollIntoView`).
- Nenhuma mudança na lógica de scroll.

**Onde mais `AssetThumbnail` é usado**: rg pelo projeto para verificar; a princípio só `PreviewThumbStrip`. Se houver outros consumidores (ex: grids da biblioteca), eles continuam funcionando — o default `eager=false` ativa o lazy automaticamente, o que é desejável e seguro graças ao placeholder.

### Por que não mexer em `PreviewStage`

A stage já carrega URL apenas para o `asset` ativo (um `useEffect` com `[asset]`), então só faz **1** chamada por troca de asset. O cache de 5 min em `asset-urls.ts` cobre voltas (`←`/`→`) sem novas requisições. Sem otimização adicional necessária.

### Critérios de aceite

- Abrir `/dam/preview` com ≥30 resultados dispara apenas as chamadas `createSignedUrl` das thumbs visíveis no strip horizontal + a do asset ativo (verificável na aba Network).
- Rolar o strip horizontalmente carrega as thumbs adicionais sob demanda, sem flicker da thumb ativa.
- Navegação por `←`/`→`/`j`/`k`/`Home`/`End` continua instantânea (cache + eager para a ativa).
- Sem regressão em outros componentes que usem `AssetThumbnail` (default lazy é seguro pelo placeholder).
- Sem warnings TS estritos; observer é limpo no unmount.

