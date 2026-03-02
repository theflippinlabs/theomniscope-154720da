
-- User access tracking table
CREATE TABLE public.user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  wallet_address text,
  access_type text NOT NULL DEFAULT 'none',
  credits integer NOT NULL DEFAULT 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  subscription_expires_at timestamptz,
  nft_verified boolean NOT NULL DEFAULT false,
  session_token text UNIQUE,
  session_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read user_access" ON public.user_access FOR SELECT USING (true);
CREATE POLICY "Public insert user_access" ON public.user_access FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update user_access" ON public.user_access FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER update_user_access_updated_at
  BEFORE UPDATE ON public.user_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Credit usage logs
CREATE TABLE public.credit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_access_id uuid NOT NULL REFERENCES public.user_access(id) ON DELETE CASCADE,
  action text NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read credit_logs" ON public.credit_logs FOR SELECT USING (true);
CREATE POLICY "Public insert credit_logs" ON public.credit_logs FOR INSERT WITH CHECK (true);

-- Analytics events
CREATE TABLE public.access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert access_events" ON public.access_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read access_events" ON public.access_events FOR SELECT USING (true);
