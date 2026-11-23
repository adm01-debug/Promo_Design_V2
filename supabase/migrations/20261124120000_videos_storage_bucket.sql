-- Bucket privado para os MP4 gerados pela edge `video-generate`.
--
-- Motivo: a Video Generation API do OpenRouter devolve URLs pré-assinadas que
-- expiram (`expires_at`). Guardar essa URL em `videos.video_url` faria os vídeos
-- pararem de abrir depois de algumas horas. A edge copia o MP4 para este bucket
-- e grava o CAMINHO em `videos.video_url`; o front troca por uma signed URL na
-- hora de abrir/baixar (src/features/video/lib/video-url.ts).
--
-- Caminho: {organization_id}/{video_id}.mp4
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO NOTHING;

-- Leitura: membros da organização dona do vídeo. O primeiro segmento do path é
-- o organization_id; o cast só roda quando o segmento é um UUID válido, para
-- não estourar em objetos fora do padrão.
CREATE POLICY "Org members can read videos bucket"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND is_member_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- Escrita: só o service role (a edge) grava o MP4. Nenhum cliente sobe vídeo
-- por este bucket, então não há policy de INSERT para authenticated.

-- Exclusão: owner/admin da organização, acompanhando a policy de DELETE em
-- public.videos para não deixar MP4 órfão consumindo storage.
CREATE POLICY "Admins can delete from videos bucket"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND is_member_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
    AND has_any_role(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid,
      ARRAY['owner'::app_role, 'admin'::app_role]
    )
  );
