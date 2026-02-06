/*
  # Update settings & SLA RLS to allow admin + it manage

  - Reuse `public.is_admin_or_it(uuid)` for admin/it checks
  - Update manage policy on `public.settings`
  - Update update policy on `public.sla_policies`
*/

-- Settings: allow admin/it manage
DROP POLICY IF EXISTS "Allow admin manage settings" ON public.settings;
DROP POLICY IF EXISTS "Allow admin/it manage settings" ON public.settings;
CREATE POLICY "Allow admin/it manage settings"
  ON public.settings
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_it(auth.uid()))
  WITH CHECK (public.is_admin_or_it(auth.uid()));

-- SLA Policies: allow admin/it update
DROP POLICY IF EXISTS "Allow admin update sla_policies" ON public.sla_policies;
DROP POLICY IF EXISTS "Allow admin/it update sla_policies" ON public.sla_policies;
CREATE POLICY "Allow admin/it update sla_policies"
  ON public.sla_policies
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_it(auth.uid()))
  WITH CHECK (public.is_admin_or_it(auth.uid()));
