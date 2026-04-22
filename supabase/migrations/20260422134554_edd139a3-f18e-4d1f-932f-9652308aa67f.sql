-- Ensure updated_at helper exists first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Allow users to insert their own role at signup (candidate or recruiter only)
CREATE POLICY "Users insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('candidate'::app_role, 'recruiter'::app_role)
);

-- Hiring decisions
CREATE TABLE public.hiring_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  recruiter_id UUID NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('strong_hire', 'consider', 'reject')),
  rationale TEXT,
  ai_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX hiring_decisions_interview_unique ON public.hiring_decisions(interview_id);

ALTER TABLE public.hiring_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters view all decisions"
ON public.hiring_decisions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'recruiter'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Candidates view own decisions"
ON public.hiring_decisions
FOR SELECT
TO authenticated
USING (auth.uid() = candidate_id);

CREATE POLICY "Recruiters insert decisions"
ON public.hiring_decisions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = recruiter_id
  AND (public.has_role(auth.uid(), 'recruiter'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Recruiters update own decisions"
ON public.hiring_decisions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = recruiter_id
  AND (public.has_role(auth.uid(), 'recruiter'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE TRIGGER update_hiring_decisions_updated_at
BEFORE UPDATE ON public.hiring_decisions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update signup trigger to honor account_type metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  account_type TEXT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  account_type := COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'candidate');
  IF account_type = 'recruiter' THEN
    assigned_role := 'recruiter'::public.app_role;
  ELSE
    assigned_role := 'candidate'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$function$;
