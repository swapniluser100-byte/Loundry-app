-- Starter rate card (₹ per piece), edit freely to match your shop's actual
-- pricing - this only feeds the "estimated amount" shown while creating an
-- order; the admin can still type a different final amount at pickup.

INSERT INTO rate_card (item_name, service_type, price) VALUES
  ('shirt',    'Wash',      20),
  ('shirt',    'Iron',      10),
  ('shirt',    'Dry Clean', 60),

  ('pant',     'Wash',      25),
  ('pant',     'Iron',      10),
  ('pant',     'Dry Clean', 70),

  ('saree',    'Wash',      40),
  ('saree',    'Iron',      20),
  ('saree',    'Dry Clean', 150),

  ('bedsheet', 'Wash',      35),
  ('bedsheet', 'Iron',      15),
  ('bedsheet', 'Dry Clean', 100),

  ('other',    'Wash',      20),
  ('other',    'Iron',      10),
  ('other',    'Dry Clean', 50);
