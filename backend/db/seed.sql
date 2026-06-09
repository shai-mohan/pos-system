USE pos_system;

INSERT INTO menu_categories (name, sort_order) VALUES
  ('Coffee', 1),
  ('Tea', 2),
  ('Main Course', 3),
  ('Desserts', 4),
  ('Beverages', 5);

INSERT INTO menu_items (name, price, category_id, description, available) VALUES
  ('Latte', 5.00, 1, 'Espresso with steamed milk', 1),
  ('Cappuccino', 5.00, 1, 'Espresso with foamed milk', 1),
  ('Americano', 4.00, 1, 'Espresso with hot water', 1),
  ('Green Tea', 3.50, 2, 'Fresh brewed green tea', 1),
  ('Chai Latte', 4.50, 2, 'Spiced tea with milk', 1),
  ('Burger', 12.00, 3, 'Beef patty with lettuce and tomato', 1),
  ('Pasta', 11.00, 3, 'Creamy alfredo pasta', 1),
  ('Grilled Chicken', 13.00, 3, 'Herb marinated chicken breast', 1),
  ('Fries', 4.00, 3, 'Crispy golden fries', 1),
  ('Cheesecake', 6.00, 4, 'New York style cheesecake', 1),
  ('Croissant', 3.50, 4, 'Buttery French croissant', 1),
  ('Brownie', 4.50, 4, 'Chocolate fudge brownie', 1),
  ('Coke', 2.50, 5, 'Chilled cola', 1),
  ('Orange Juice', 3.00, 5, 'Fresh squeezed orange', 1),
  ('Sparkling Water', 2.00, 5, 'Still or sparkling', 1);

INSERT INTO restaurant_tables (table_number, status) VALUES
  ('T1', 'available'),
  ('T2', 'available'),
  ('T3', 'available'),
  ('T4', 'available'),
  ('T5', 'available'),
  ('T6', 'available'),
  ('T7', 'available'),
  ('T8', 'available'),
  ('T9', 'available'),
  ('T10', 'available');
