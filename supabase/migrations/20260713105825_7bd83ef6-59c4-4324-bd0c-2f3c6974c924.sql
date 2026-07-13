-- 1) organization_members: impede admin (não-owner) de gravar role='owner'
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.organization_members;
CREATE POLICY "Owners and admins can add members"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role])
    AND (
      -- Só owners podem criar/promover a owner. Admins ficam restritos aos demais papéis.
      role <> 'owner'::app_role
      OR has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role])
    )
  );

-- 2) ai_usage_log: exige user_id = auth.uid() e membership na organização
DROP POLICY IF EXISTS "Users can insert their own usage logs" ON public.ai_usage_log;
CREATE POLICY "Users can insert their own usage logs"
  ON public.ai_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (organization_id IS NULL OR is_member_of(auth.uid(), organization_id))
  );

-- 3) status_audit_log: exige que a service_order pertença a uma org do usuário
DROP POLICY IF EXISTS "System can insert audit logs" ON public.status_audit_log;
CREATE POLICY "System can insert audit logs"
  ON public.status_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = status_audit_log.service_order_id
        AND (
          so.user_id = auth.uid()
          OR (so.organization_id IS NOT NULL AND is_member_of(auth.uid(), so.organization_id))
        )
    )
  );