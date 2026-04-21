

## Aba "Aplicação" no preview do brand kit

Já existe `BrandApplicationPreview.tsx` (header simulado + 3 cards de produto usando cores primárias/secundárias e fontes carregadas). Falta apenas surfacing: hoje a página de preview mostra só `BrandPreviewCard`. Vamos envolver os dois em `Tabs` para o usuário alternar entre "Identidade" (paleta + fontes) e "Aplicação" (mockup de site).

### Mudanças

**`src/features/dam/pages/BrandGuidelinesPage.tsx`** (ou onde o preview é renderizado — confirmar via leitura)
- Importar `Tabs, TabsList, TabsTrigger, TabsContent` (já usado na página) e `BrandApplicationPreview`.
- Substituir o render direto de `<BrandPreviewCard ... />` por:
  ```tsx
  <Tabs defaultValue="identity">
    <TabsList>
      <TabsTrigger value="identity">Identidade</TabsTrigger>
      <TabsTrigger value="application">Aplicação</TabsTrigger>
    </TabsList>
    <TabsContent value="identity">
      <BrandPreviewCard {...props} />
    </TabsContent>
    <TabsContent value="application">
      <BrandApplicationPreview {...props} />
    </TabsContent>
  </Tabs>
  ```
- Ambos componentes recebem o mesmo conjunto de props (`clientName`, `primary`, `secondary`, `fonts`, `logo`), então é só repassar.

### Critérios de aceite

- Na aba de preview da brand guidelines, aparecem duas tabs: **Identidade** (default, mostra `BrandPreviewCard` atual) e **Aplicação** (mostra `BrandApplicationPreview` com header de site + 3 cards de produto).
- Trocar de tab é instantâneo, sem recarregar fontes (cache do `useGoogleFonts` reaproveita).
- Cores primárias dirigem header e botões; cores secundárias aparecem em card promocional e outline; fonte heading nos títulos, body no resto.
- Logo (se configurado) aparece no header simulado; senão, mostra inicial do nome do cliente.
- Sem regressão: edição de cores/fontes/regras, salvar, exportar PDF e WCAG continuam funcionando idênticos.

