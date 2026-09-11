-- Communication channel switched from SMS to email: customers now need an
-- email address to receive order notifications. Phone number is kept as-is
-- - it remains the front-desk lookup key at drop-off.

ALTER TABLE customers ADD COLUMN email TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_customers_email ON customers(email);
