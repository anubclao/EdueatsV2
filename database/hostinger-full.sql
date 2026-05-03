-- ============================================================
-- EduEats - Script completo para Hostinger
-- Base de datos destino: u652436213_Edueat
-- ============================================================

CREATE DATABASE IF NOT EXISTS u652436213_Edueat
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE u652436213_Edueat;

-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id          VARCHAR(50)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  is_system   TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                 VARCHAR(36)  NOT NULL,
  name               VARCHAR(150) NOT NULL,
  email              VARCHAR(150) NOT NULL UNIQUE,
  phone              VARCHAR(30),
  role               VARCHAR(50)  NOT NULL DEFAULT 'student',
  grade              TINYINT UNSIGNED,
  section            VARCHAR(10),
  allergies          TEXT,
  email_verified     TINYINT(1)   NOT NULL DEFAULT 0,
  verification_token VARCHAR(64),
  token_expires_at   BIGINT,
  PRIMARY KEY (id),
  CONSTRAINT fk_users_role FOREIGN KEY (role) REFERENCES roles(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id      VARCHAR(50)  NOT NULL,
  name    VARCHAR(100) NOT NULL,
  `order` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. RECIPES
-- ============================================================
CREATE TABLE IF NOT EXISTS recipes (
  id          VARCHAR(36)  NOT NULL,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  category    VARCHAR(50)  NOT NULL,
  calories    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  image_url   TEXT,
  PRIMARY KEY (id),
  CONSTRAINT fk_recipes_category FOREIGN KEY (category) REFERENCES categories(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. DAILY MENU CONFIGS
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_menu_configs (
  date         DATE       NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_menu_items (
  menu_date    DATE       NOT NULL,
  recipe_id    VARCHAR(36) NOT NULL,
  is_mandatory TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (menu_date, recipe_id),
  CONSTRAINT fk_dmi_menu   FOREIGN KEY (menu_date) REFERENCES daily_menu_configs(date) ON DELETE CASCADE,
  CONSTRAINT fk_dmi_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                VARCHAR(36)  NOT NULL,
  student_id        VARCHAR(36)  NOT NULL,
  student_name      VARCHAR(150) NOT NULL,
  student_grade     TINYINT UNSIGNED,
  student_section   VARCHAR(10),
  student_allergies TEXT,
  date              DATE         NOT NULL,
  status            ENUM('confirmed','pending') NOT NULL DEFAULT 'pending',
  timestamp         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id        INT UNSIGNED AUTO_INCREMENT,
  order_id  VARCHAR(36) NOT NULL,
  category  VARCHAR(50) NOT NULL,
  recipe_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_orders_student_date ON orders(student_id, date);
CREATE INDEX idx_orders_date_status ON orders(date, status);
CREATE INDEX idx_orders_timestamp ON orders(timestamp);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_recipe_id ON order_items(recipe_id);

-- ============================================================
-- 7. RECURRING PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_preferences (
  student_id  VARCHAR(36)      NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL COMMENT '0=Domingo ... 6=Sabado',
  PRIMARY KEY (student_id, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recurring_preference_items (
  id          INT UNSIGNED AUTO_INCREMENT,
  student_id  VARCHAR(36)      NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  category    VARCHAR(50)      NOT NULL,
  recipe_id   VARCHAR(36)      NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_rpi_pref FOREIGN KEY (student_id, day_of_week)
    REFERENCES recurring_preferences(student_id, day_of_week) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 8. SYSTEM NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_notifications (
  id               VARCHAR(36) NOT NULL,
  date             DATE        NOT NULL,
  message          TEXT        NOT NULL,
  original_message TEXT,
  type             ENUM('info','alert','success') NOT NULL DEFAULT 'info',
  target_role      ENUM('all','student','staff')  NOT NULL DEFAULT 'all',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 9. SURVEY DEFINITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS survey_definitions (
  id         VARCHAR(36)  NOT NULL,
  title      VARCHAR(150) NOT NULL,
  start_date DATE         NOT NULL,
  end_date   DATE         NOT NULL,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 10. SURVEY RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS survey_results (
  id                   VARCHAR(36)  NOT NULL,
  survey_definition_id VARCHAR(36)  NOT NULL,
  user_id              VARCHAR(36)  NOT NULL,
  user_name            VARCHAR(150) NOT NULL,
  user_role            VARCHAR(50)  NOT NULL,
  user_phone           VARCHAR(30)  NULL,
  date                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  quality_rating       TINYINT UNSIGNED NOT NULL DEFAULT 3,
  quantity_rating      TINYINT UNSIGNED NOT NULL DEFAULT 3,
  type                 ENUM('suggestion','complaint','claim','congratulation') NOT NULL,
  comment              TEXT,
  admin_response       TEXT,
  status               ENUM('pending','resolved') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (id),
  CONSTRAINT fk_sr_definition FOREIGN KEY (survey_definition_id)
    REFERENCES survey_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 11. GLOBAL VARIABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS global_variables (
  id        VARCHAR(100) NOT NULL,
  name      VARCHAR(150) NOT NULL,
  value     TEXT         NOT NULL,
  is_system TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 12. GENERATED REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_reports (
  id             VARCHAR(36)            NOT NULL,
  type           ENUM('overview','kpi') NOT NULL,
  date_generated DATETIME               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  title          VARCHAR(255)           NOT NULL,
  content        LONGTEXT               NOT NULL,
  filters_used   JSON,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DATOS INICIALES
-- ============================================================

INSERT IGNORE INTO roles (id, name, description, is_system) VALUES
  ('admin',   'Administrador',           'Acceso total al sistema', 1),
  ('student', 'Estudiante',              'Puede realizar pedidos', 1),
  ('teacher', 'Profesor',                'Personal docente. Puede realizar pedidos', 1),
  ('staff',   'Personal Administrativo', 'Personal del colegio. Puede realizar pedidos', 1),
  ('visitor', 'Visitante',               'Visitante externo. Puede realizar pedidos', 1);

INSERT IGNORE INTO users (id, name, email, phone, role, grade, section, allergies, email_verified) VALUES
  ('super-admin-01',  'Super Admin',          'superadmin@edueats.com', NULL,           'admin',   NULL, NULL, NULL, 1),
  ('test-teacher-01', 'Profesor de Prueba',   'profesor@edueats.com',   '573001112233', 'teacher', NULL, NULL, NULL, 1),
  ('test-student-01', 'Estudiante de Prueba', 'estudiante@edueats.com', '573004445566', 'student', 5,    'A',  NULL, 1);

INSERT IGNORE INTO categories (id, name, `order`) VALUES
  ('starter',             'Entrada',             1),
  ('soup',                'Sopa',                2),
  ('main',                'Plato Principal',     3),
  ('vegetarian',          'Vegetariano',         4),
  ('ensaladas-y-frutas',  'Ensaladas y Frutas',  5),
  ('snack',               'Snack',               6),
  ('dessert',             'Postre',              7),
  ('general',             'General',             8);

INSERT IGNORE INTO recipes (id, name, description, category, calories, image_url) VALUES
  ('s1', 'Crema de Tomate',           'Tomates asados con un toque de albahaca fresca',               'soup',       150, '/images/soup/s1.jpg'),
  ('s2', 'Ajiaco Santafereño',        'Sopa tradicional de papa con guascas',                         'soup',       250, '/images/soup/s2.jpg'),
  ('1',  'Bastones de Zanahoria',     'Frescos con dip de queso crema',                               'starter',     80, '/images/starter/1.jpg'),
  ('2',  'Ensalada Cesar',            'Clasica con crutones, parmesano y aderezo especial',           'starter',    180, '/images/starter/2.jpg'),
  ('3',  'Pollo a la Parrilla',       'Pechuga marinada con hierbas finas y limon',                   'main',       450, '/images/main/3.jpg'),
  ('4',  'Espagueti Boloñesa',        'Pasta al dente con salsa de carne casera italiana',            'main',       550, '/images/main/4.jpg'),
  ('v1', 'Hamburguesa de Lentejas',   'Opcion vegetariana rica en proteina con pan integral',         'vegetarian', 380, '/images/vegetarian/v1.jpg'),
  ('v2', 'Bowl de Quinoa y Vegetales','Mix nutritivo con aguacate y vinagreta de limon',              'vegetarian', 320, '/images/vegetarian/v2.jpg'),
  ('6',  'Pie de Manzana',            'Receta casera tibia con canela',                               'dessert',    300, '/images/dessert/6.jpg'),
  ('7',  'Ensalada de Frutas',        'Mix de frutas de temporada frescas picadas',                   'dessert',    150, '/images/dessert/7.jpg'),
  ('8',  'Yogur Griego',              'Cremosidad natural con miel organica y granola crujiente',     'snack',      120, '/images/snack/8.jpg'),
  ('9',  'Barrita de Cereal',         'Energia saludable con avena, miel y frutos secos',             'snack',      180, '/images/snack/9.jpg');

INSERT IGNORE INTO global_variables (id, name, value, is_system) VALUES
  ('schoolName', 'Colegio', 'EduEats School', 1);
