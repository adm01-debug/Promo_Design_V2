-- Deprecação dos overloads legados: agora existe apenas 1 assinatura canônica por função.
-- Callers já migrados para as assinaturas canônicas (mockup-ai usa 2-arg; edge functions de cleanup usam 5-arg).

DROP FUNCTION IF EXISTS public.check_ai_quota(uuid);
DROP FUNCTION IF EXISTS public.cleanup_expired_data(integer, integer, integer);