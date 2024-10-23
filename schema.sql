CREATE DATABASE todo_tutorial;

USE todo_tutorial;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  qty INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  wholesale_price DECIMAL(10, 2) NOT NULL,
  retail_price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE requests (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  qty INT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES inventory(id)
);


CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_date DATE NOT NULL,
    FOREIGN KEY (order_id) REFERENCES requests(order_id)
);
