CREATE DATABASE IF NOT EXISTS haulhub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE haulhub;

CREATE TABLE IF NOT EXISTS companies (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL,
  contact_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(190) NOT NULL,
  account_status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_companies_name (name),
  UNIQUE KEY uq_companies_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS drivers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(190) NULL,
  license_number VARCHAR(50) NOT NULL,
  status ENUM('available', 'on-trip', 'maintenance') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_drivers_phone (phone),
  UNIQUE KEY uq_drivers_license (license_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trucks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  truck_number VARCHAR(30) NOT NULL,
  plate_number VARCHAR(30) NOT NULL,
  driver_id INT UNSIGNED NULL,
  location VARCHAR(150) NOT NULL,
  capacity_tonnes DECIMAL(8, 2) UNSIGNED NOT NULL,
  status ENUM('available', 'on-trip', 'maintenance') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trucks_number (truck_number),
  UNIQUE KEY uq_trucks_plate (plate_number),
  UNIQUE KEY uq_trucks_driver (driver_id),
  CONSTRAINT fk_trucks_driver FOREIGN KEY (driver_id)
    REFERENCES drivers (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_code VARCHAR(30) NOT NULL,
  company_id INT UNSIGNED NOT NULL,
  truck_id INT UNSIGNED NULL,
  pickup_city VARCHAR(100) NOT NULL,
  drop_city VARCHAR(100) NOT NULL,
  load_type VARCHAR(150) NOT NULL,
  weight_tonnes DECIMAL(8, 2) UNSIGNED NOT NULL,
  status ENUM('requested', 'confirmed', 'in_transit', 'delivered', 'cancelled')
    NOT NULL DEFAULT 'requested',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_code (booking_code),
  KEY ix_bookings_company_created (company_id, created_at),
  KEY ix_bookings_status (status),
  CONSTRAINT fk_bookings_company FOREIGN KEY (company_id)
    REFERENCES companies (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_truck FOREIGN KEY (truck_id)
    REFERENCES trucks (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

INSERT INTO companies (name, city, contact_name, phone, email) VALUES
  ('Sharma Foods', 'Delhi, NCR', 'Priya Sharma', '+91 98100 12345', 'logistics@sharmafoods.in'),
  ('Metro Wholesale', 'Gurugram, HR', 'Neha Verma', '+91 98112 76045', 'dispatch@metrowholesale.in'),
  ('Northstar Retail', 'Jaipur, RJ', 'Rahul Mehta', '+91 98710 22341', 'transport@northstarretail.in'),
  ('Greenfield Agri', 'Agra, UP', 'Aman Singh', '+91 98991 54602', 'loads@greenfieldagri.in')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO drivers (full_name, phone, license_number, status) VALUES
  ('Ravi Kumar', '+91 98765 43210', 'DL-0420110012345', 'available'),
  ('Mohit Yadav', '+91 98112 76045', 'HR-0520120067890', 'on-trip'),
  ('Sandeep Singh', '+91 98710 22341', 'RJ-1420100098765', 'available'),
  ('Imran Khan', '+91 98991 54602', 'UP-1620130043210', 'on-trip'),
  ('Vikram Patel', '+91 98100 76829', 'DL-0120090054321', 'maintenance'),
  ('Amit Verma', '+91 98182 34900', 'HR-3820140076543', 'available')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

INSERT INTO trucks (truck_number, plate_number, driver_id, location, capacity_tonnes, status)
SELECT 'HH-008', 'DL 1L AB 2841', id, 'Delhi, NCR', 14, 'available'
FROM drivers WHERE phone = '+91 98765 43210'
ON DUPLICATE KEY UPDATE plate_number = VALUES(plate_number);

INSERT INTO trucks (truck_number, plate_number, driver_id, location, capacity_tonnes, status)
SELECT 'HH-014', 'HR 55 C 7312', id, 'Gurugram, HR', 10, 'on-trip'
FROM drivers WHERE phone = '+91 98112 76045'
ON DUPLICATE KEY UPDATE plate_number = VALUES(plate_number);

INSERT INTO trucks (truck_number, plate_number, driver_id, location, capacity_tonnes, status)
SELECT 'HH-021', 'RJ 14 GD 9063', id, 'Jaipur, RJ', 18, 'available'
FROM drivers WHERE phone = '+91 98710 22341'
ON DUPLICATE KEY UPDATE plate_number = VALUES(plate_number);

INSERT INTO trucks (truck_number, plate_number, driver_id, location, capacity_tonnes, status)
SELECT 'HH-027', 'UP 16 FT 4108', id, 'Agra, UP', 12, 'on-trip'
FROM drivers WHERE phone = '+91 98991 54602'
ON DUPLICATE KEY UPDATE plate_number = VALUES(plate_number);

INSERT INTO trucks (truck_number, plate_number, driver_id, location, capacity_tonnes, status)
SELECT 'HH-032', 'DL 01 GC 5520', id, 'Delhi, NCR', 8, 'maintenance'
FROM drivers WHERE phone = '+91 98100 76829'
ON DUPLICATE KEY UPDATE plate_number = VALUES(plate_number);

INSERT INTO trucks (truck_number, plate_number, driver_id, location, capacity_tonnes, status)
SELECT 'HH-036', 'HR 38 X 1129', id, 'Faridabad, HR', 16, 'available'
FROM drivers WHERE phone = '+91 98182 34900'
ON DUPLICATE KEY UPDATE plate_number = VALUES(plate_number);

INSERT INTO bookings
  (booking_code, company_id, truck_id, pickup_city, drop_city, load_type, weight_tonnes, status)
SELECT 'BK-24091', c.id, t.id, 'Delhi', 'Jaipur', 'Packaged food', 8, 'in_transit'
FROM companies c JOIN trucks t ON t.truck_number = 'HH-008'
WHERE c.name = 'Sharma Foods'
ON DUPLICATE KEY UPDATE booking_code = VALUES(booking_code);

INSERT INTO bookings
  (booking_code, company_id, truck_id, pickup_city, drop_city, load_type, weight_tonnes, status)
SELECT 'BK-24090', c.id, t.id, 'Gurugram', 'Agra', 'Retail goods', 6, 'in_transit'
FROM companies c JOIN trucks t ON t.truck_number = 'HH-014'
WHERE c.name = 'Metro Wholesale'
ON DUPLICATE KEY UPDATE booking_code = VALUES(booking_code);

INSERT INTO bookings
  (booking_code, company_id, truck_id, pickup_city, drop_city, load_type, weight_tonnes, status)
SELECT 'BK-24089', c.id, t.id, 'Jaipur', 'Delhi', 'Home supplies', 12, 'confirmed'
FROM companies c JOIN trucks t ON t.truck_number = 'HH-021'
WHERE c.name = 'Northstar Retail'
ON DUPLICATE KEY UPDATE booking_code = VALUES(booking_code);

INSERT INTO bookings
  (booking_code, company_id, truck_id, pickup_city, drop_city, load_type, weight_tonnes, status)
SELECT 'BK-24088', c.id, t.id, 'Agra', 'Gurugram', 'Grain', 10, 'in_transit'
FROM companies c JOIN trucks t ON t.truck_number = 'HH-027'
WHERE c.name = 'Greenfield Agri'
ON DUPLICATE KEY UPDATE booking_code = VALUES(booking_code);

INSERT INTO bookings
  (booking_code, company_id, pickup_city, drop_city, load_type, weight_tonnes, status)
SELECT 'BK-24087', id, 'Delhi', 'Agra', 'Cold storage', 5, 'requested'
FROM companies WHERE name = 'Sharma Foods'
ON DUPLICATE KEY UPDATE booking_code = VALUES(booking_code);
