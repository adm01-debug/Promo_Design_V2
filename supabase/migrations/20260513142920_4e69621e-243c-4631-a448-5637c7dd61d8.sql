-- Drop existing update policy
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.organization_members;

-- Create more granular update policy
CREATE POLICY "Owners can update any member role" 
ON public.organization_members 
FOR UPDATE 
USING (has_role(auth.uid(), organization_id, 'owner'))
WITH CHECK (has_role(auth.uid(), organization_id, 'owner'));

-- Admins can update members but not change their own or others' roles to owner 
-- Actually, it's safer to just let only owners handle role changes.
-- If we want admins to update other fields (if any), we'd need column-level logic.
-- Since organization_members mostly just has organization_id, user_id, and role, 
-- restricting it to owners is the most secure path.
