import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "gcash_monitor",
  waitForConnections: true,
  connectionLimit: 10,
});

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_name TEXT,
      amount DECIMAL(14,2) NOT NULL,
      type ENUM('credit', 'deduction') NOT NULL DEFAULT 'credit',
      reference_number VARCHAR(20),
      transaction_date DATETIME NOT NULL,
      note TEXT,
      batch_number INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key_name VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await pool.query(`
    INSERT IGNORE INTO settings (key_name, value) VALUES ('opening_balance', '0')
  `);

  const alterQueries = [
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type ENUM('credit','deduction') NOT NULL DEFAULT 'credit'`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS note TEXT`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS batch_number INT NULL`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account VARCHAR(50) NULL`,
    `ALTER TABLE transactions MODIFY COLUMN amount DECIMAL(14,2) NOT NULL`,
    `ALTER TABLE transactions MODIFY COLUMN transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  ];

  for (const q of alterQueries) {
    try { await pool.query(q); } catch { /* column may already exist */ }
  }
}

export default pool;
