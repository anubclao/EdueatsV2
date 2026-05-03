-- ============================================================
-- INSERTAR CATEGORÍAS EN LA BASE DE DATOS
-- ============================================================

USE edueat;

INSERT INTO categories (id, name, `order`) VALUES
  ('starter', 'Entrada', 1),
  ('soup', 'Sopa', 2),
  ('main', 'Plato Principal', 3),
  ('vegetarian', 'Vegetariano', 4),
  ('ensaladas-y-frutas', 'Ensaladas y Frutas', 5),
  ('snack', 'Snack', 6),
  ('dessert', 'Postre', 7),
  ('general', 'General', 8);
