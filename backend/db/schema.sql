CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_name TEXT,
  amount DECIMAL(14,2) NOT NULL,
  type ENUM('credit', 'deduction') NOT NULL DEFAULT 'credit',
  reference_number VARCHAR(20),
  transaction_date DATETIME NOT NULL,
  note TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
