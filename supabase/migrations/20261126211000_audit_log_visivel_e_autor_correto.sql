-- 1) O historico de status so era legivel quando auth.uid() = user_id, ou seja
--    ninguem da organizacao enxergava o historico das OS do time (admin/owner
--    inclusive). A policy nova libera o dono da OS e os membros da organizacao
--    dela; como policies de SELECT sao OR, a antiga continua valendo.
DROP POLICY IF EXISTS "Org members can view order status history" ON public.status_audit_log;
CREATE POLICY "Org members can view order status history"
  ON public.status_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.service_orders so
       WHERE so.id = status_audit_log.service_order_id
         AND (
           so.user_id = auth.uid()
           OR (so.organization_id IS NOT NULL AND public.is_member_of(auth.uid(), so.organization_id))
         )
    )
  );

-- 2) log_status_change gravava NEW.user_id (o dono da OS) como autor da
--    mudanca. Com o historico na tela, isso mostraria a pessoa errada quando
--    outro membro mudasse o status. O autor passa a ser auth.uid() quando
--    existir, com fallback para o dono da OS em operacoes de service_role.
CREATE OR REPLACE FUNCTION public.log_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.status_audit_log (service_order_id, user_id, old_status, new_status)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), NULL, NEW.status);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.status_audit_log (service_order_id, user_id, old_status, new_status)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), OLD.status, NEW.status);
  END IF;

  RETURN NEW;
END;
$function$;
-- 3) Backfill: as OS que ja existiam (ou foram importadas com triggers
--    desligados) nao tem nenhuma linha no historico, entao a tela nasceria
--    vazia para elas. Grava o marco inicial — status atual na data de criacao —
--    apenas para OS sem nenhum registro. Idempotente.
INSERT INTO public.status_audit_log (service_order_id, user_id, old_status, new_status, changed_at)
SELECT so.id, so.user_id, NULL, so.status, so.created_at
  FROM public.service_orders so
 WHERE NOT EXISTS (
   SELECT 1 FROM public.status_audit_log sal WHERE sal.service_order_id = so.id
 );