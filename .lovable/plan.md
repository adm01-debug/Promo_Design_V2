

## PDF do Resumo já incorpora mockups — sem mudanças necessárias

O `generateClientSummaryPdf` em `src/features/service-orders/lib/ClientSummaryPdf.ts` já faz exatamente isso:

1. **Seleciona até 12 mockups** com `orders.filter((o) => o.mockupImageUrl).slice(0, 12)`.
2. **Baixa todas as imagens em paralelo** via `Promise.all(withMockups.map((o) => fetchAsDataUrl(o.mockupImageUrl)))` antes de adicioná-las ao documento.
3. **Converte cada uma para Data URL base64** (`FileReader.readAsDataURL` do blob), garantindo que o PDF fique 100% self-contained.
4. **Embute via `doc.addImage(dataUrl, "JPEG", …)`** em grid de 3 colunas, com fallback silencioso (`try/catch`) caso uma imagem específica falhe.
5. **Aguarda o `await Promise.all`** antes de chamar `doc.save()` no `ClientsPage`, então o arquivo gerado já contém todos os bytes embutidos — abre offline, em e-mail, em qualquer visualizador.

### Possíveis melhorias se quiser estender

- **Indicador de progresso** ("Baixando mockups 5/12…") no diálogo durante o `fetchAsDataUrl`.
- **Compressão automática** das imagens grandes (resize para ~600px no canvas antes de embutir) para reduzir tamanho do PDF.
- **Aumentar o limite** de 12 para 24/configurável, com paginação automática.
- **Marcar visualmente** OSs que tiveram falha no download (placeholder "imagem indisponível").
- **Pré-carregar via signed URL do Supabase Storage** se o `mockup_image_url` for path interno (hoje assume URL pública/CDN).

Me diga qual desses (ou outro) e eu monto o plano.

