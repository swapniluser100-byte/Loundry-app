-- Initial schema for the Pune Laundry Management app.
-- Extends the brief's core tables (customers, orders, status_logs) with a
-- few small additions needed to make the app actually work:
--   orders.order_number   - the human-facing "PN-LND-2026-000123" id
--   orders.service_type   - Wash / Iron / Dry Clean, set at drop-off
--   orders.updated_at     - last status/amount change, shown on dashboard
--   staff_users           - admin/staff login (JWT auth)
--   rate_card             - per-item, per-service prices for auto-calc
--   order_counters        - per-year sequence used to build order_number

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  area TEXT,
  landmark TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_customers_phone ON customers(phone);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  items_json TEXT NOT NULL,
  service_type TEXT NOT NULL,
  amount REAL,
  status TEXT NOT NULL DEFAULT 'Received',
  qr_code_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE UNIQUE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE status_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_status_logs_order ON status_logs(order_id);

CREATE TABLE staff_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE rate_card (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  price REAL NOT NULL,
  UNIQUE(item_name, service_type)
);

CREATE TABLE order_counters (
  year INTEGER PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);
