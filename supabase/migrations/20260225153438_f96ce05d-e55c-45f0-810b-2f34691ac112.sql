
-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Anyone can read invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Anyone can validate codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Anyone can claim unused invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Anyone can use a code" ON public.invitation_codes;
DROP POLICY IF EXISTS "Anyone can insert codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Anyone can insert invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Anyone can delete codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Anyone can delete invitation codes" ON public.invitation_codes;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Allow select invitation codes" ON public.invitation_codes FOR SELECT USING (true);
CREATE POLICY "Allow update invitation codes" ON public.invitation_codes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow insert invitation codes" ON public.invitation_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete invitation codes" ON public.invitation_codes FOR DELETE USING (true);
