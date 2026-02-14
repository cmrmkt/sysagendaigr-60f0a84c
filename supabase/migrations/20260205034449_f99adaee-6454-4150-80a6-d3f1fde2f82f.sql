-- Permitir que admins da organizacao atualizem sua propria organizacao
CREATE POLICY "Org admins can update own organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (
    id = public.get_user_org(auth.uid())
    AND public.is_org_admin(auth.uid())
  )
  WITH CHECK (
    id = public.get_user_org(auth.uid())
    AND public.is_org_admin(auth.uid())
  );