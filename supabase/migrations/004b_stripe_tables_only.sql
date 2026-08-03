CREATE TABLE IF NOT EXISTS stripe_customers (
  customer_id TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS stripe_events (
  id         TEXT        PRIMARY KEY,
  type       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
