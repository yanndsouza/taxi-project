import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database | null = null;

export async function initializeDatabase() {
  if (db) return db;

  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            customer_id TEXT PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS rides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            origin TEXT,
            destination TEXT,
            distance REAL,
            duration TEXT,
            driver_id INTEGER,
            driver_name TEXT,
            value REAL,
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        );
    `);

  return db;
}
