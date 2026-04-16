require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'military_assets',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

async function initializeDatabase() {
  const db = getPool();

  // create tables if they don't exist yet
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bases (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      location VARCHAR(200),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','base_commander','logistics_officer') NOT NULL,
      base_id VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE SET NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS asset_types (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      category ENUM('vehicle','weapon','ammunition','equipment') NOT NULL,
      unit VARCHAR(50) DEFAULT 'unit',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS purchases (
      id VARCHAR(36) PRIMARY KEY,
      asset_type_id VARCHAR(36) NOT NULL,
      base_id VARCHAR(36) NOT NULL,
      quantity INT NOT NULL,
      purchase_date DATE NOT NULL,
      notes TEXT,
      created_by VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_type_id) REFERENCES asset_types(id),
      FOREIGN KEY (base_id) REFERENCES bases(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transfers (
      id VARCHAR(36) PRIMARY KEY,
      asset_type_id VARCHAR(36) NOT NULL,
      from_base_id VARCHAR(36) NOT NULL,
      to_base_id VARCHAR(36) NOT NULL,
      quantity INT NOT NULL,
      transfer_date DATE NOT NULL,
      status ENUM('pending','completed','cancelled') DEFAULT 'completed',
      notes TEXT,
      created_by VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_type_id) REFERENCES asset_types(id),
      FOREIGN KEY (from_base_id) REFERENCES bases(id),
      FOREIGN KEY (to_base_id) REFERENCES bases(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS assignments (
      id VARCHAR(36) PRIMARY KEY,
      asset_type_id VARCHAR(36) NOT NULL,
      base_id VARCHAR(36) NOT NULL,
      assigned_to VARCHAR(200) NOT NULL,
      quantity INT NOT NULL,
      assignment_date DATE NOT NULL,
      return_date DATE,
      status ENUM('active','returned','expended') DEFAULT 'active',
      notes TEXT,
      created_by VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_type_id) REFERENCES asset_types(id),
      FOREIGN KEY (base_id) REFERENCES bases(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS expenditures (
      id VARCHAR(36) PRIMARY KEY,
      asset_type_id VARCHAR(36) NOT NULL,
      base_id VARCHAR(36) NOT NULL,
      quantity INT NOT NULL,
      expenditure_date DATE NOT NULL,
      reason VARCHAR(500) NOT NULL,
      notes TEXT,
      created_by VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_type_id) REFERENCES asset_types(id),
      FOREIGN KEY (base_id) REFERENCES bases(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  await seedData(db);
  console.log('Database ready');
  return db;
}

// seed initial data only if tables are empty
async function seedData(db) {
  const [rows] = await db.execute('SELECT COUNT(*) as cnt FROM bases');
  if (rows[0].cnt > 0) return; // already seeded

  const today = new Date().toISOString().split('T')[0];

  // bases
  const bases = [
    { id: uuidv4(), name: 'Alpha Base', location: 'Northern Region' },
    { id: uuidv4(), name: 'Bravo Base', location: 'Southern Region' },
    { id: uuidv4(), name: 'Charlie Base', location: 'Eastern Region' },
  ];
  for (const b of bases) {
    await db.execute('INSERT INTO bases (id, name, location) VALUES (?,?,?)', [b.id, b.name, b.location]);
  }

  // asset types
  const assets = [
    { id: uuidv4(), name: 'M1 Abrams Tank', category: 'vehicle', unit: 'unit' },
    { id: uuidv4(), name: 'Humvee', category: 'vehicle', unit: 'unit' },
    { id: uuidv4(), name: 'M16 Rifle', category: 'weapon', unit: 'unit' },
    { id: uuidv4(), name: 'M9 Pistol', category: 'weapon', unit: 'unit' },
    { id: uuidv4(), name: '5.56mm Ammunition', category: 'ammunition', unit: 'rounds' },
    { id: uuidv4(), name: '9mm Ammunition', category: 'ammunition', unit: 'rounds' },
    { id: uuidv4(), name: 'Body Armor', category: 'equipment', unit: 'unit' },
    { id: uuidv4(), name: 'Night Vision Goggles', category: 'equipment', unit: 'unit' },
  ];
  for (const a of assets) {
    await db.execute(
      'INSERT INTO asset_types (id, name, category, unit) VALUES (?,?,?,?)',
      [a.id, a.name, a.category, a.unit]
    );
  }

  // users
  const adminId = uuidv4();
  const cmd1Id = uuidv4();
  const cmd2Id = uuidv4();
  const logId = uuidv4();

  await db.execute('INSERT INTO users (id,username,password,role,base_id) VALUES (?,?,?,?,?)',
    [adminId, 'admin', bcrypt.hashSync('admin123', 10), 'admin', null]);
  await db.execute('INSERT INTO users (id,username,password,role,base_id) VALUES (?,?,?,?,?)',
    [cmd1Id, 'commander_alpha', bcrypt.hashSync('commander123', 10), 'base_commander', bases[0].id]);
  await db.execute('INSERT INTO users (id,username,password,role,base_id) VALUES (?,?,?,?,?)',
    [cmd2Id, 'commander_bravo', bcrypt.hashSync('commander123', 10), 'base_commander', bases[1].id]);
  await db.execute('INSERT INTO users (id,username,password,role,base_id) VALUES (?,?,?,?,?)',
    [logId, 'logistics_officer', bcrypt.hashSync('logistics123', 10), 'logistics_officer', null]);

  // initial stock purchases
  const stockData = [
    [uuidv4(), assets[0].id, bases[0].id, 5, today, 'Initial stock', adminId],
    [uuidv4(), assets[1].id, bases[0].id, 10, today, 'Initial stock', adminId],
    [uuidv4(), assets[2].id, bases[0].id, 50, today, 'Initial stock', adminId],
    [uuidv4(), assets[4].id, bases[0].id, 10000, today, 'Initial stock', adminId],
    [uuidv4(), assets[0].id, bases[1].id, 3, today, 'Initial stock', adminId],
    [uuidv4(), assets[1].id, bases[1].id, 8, today, 'Initial stock', adminId],
    [uuidv4(), assets[2].id, bases[1].id, 40, today, 'Initial stock', adminId],
    [uuidv4(), assets[4].id, bases[1].id, 8000, today, 'Initial stock', adminId],
    [uuidv4(), assets[1].id, bases[2].id, 6, today, 'Initial stock', adminId],
    [uuidv4(), assets[2].id, bases[2].id, 30, today, 'Initial stock', adminId],
    [uuidv4(), assets[4].id, bases[2].id, 6000, today, 'Initial stock', adminId],
  ];

  for (const row of stockData) {
    await db.execute(
      'INSERT INTO purchases (id,asset_type_id,base_id,quantity,purchase_date,notes,created_by) VALUES (?,?,?,?,?,?,?)',
      row
    );
  }

  console.log('Seed data inserted');
}

module.exports = { getPool, initializeDatabase };