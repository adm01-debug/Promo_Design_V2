
-- Índice parcial: acelera o polling de notificações não lidas.
-- Cobre WHERE user_id = ? AND read = false ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read = false;

-- Remove índice menos seletivo (coberto pelo parcial acima + idx_notifications_user_created).
DROP INDEX IF EXISTS public.idx_notifications_user_read;
