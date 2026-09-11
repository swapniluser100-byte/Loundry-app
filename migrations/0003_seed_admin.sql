-- Seed a default admin login so the app is usable immediately after deploy.
--
--   username: admin
--   password: Laundry@123
--
-- CHANGE THIS PASSWORD BEFORE GOING LIVE. To set a new one:
--   node scripts/hash-password.mjs "YourNewPassword"
--   wrangler d1 execute laundry_db --remote --command \
--     "UPDATE staff_users SET password_hash = '<printed hash>' WHERE username = 'admin';"

INSERT INTO staff_users (username, password_hash, role) VALUES
  ('admin', 'pbkdf2$100000$az7bFeSNg4oPvpBhSpI+Fw==$XZGeQTDUgxyW+RWe+LYGZWv6q7AKvV5XhUoOH7TM8M4=', 'admin');
