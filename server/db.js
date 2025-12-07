const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'app.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

const initDB = () => {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
            if (err) console.error("Error creating users table:", err);
            else {
                // Create default admin user if not exists
                const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
                stmt.get("admin", (err, row) => {
                    if (!row) {
                        const passwordHash = bcrypt.hashSync("admin123", 10);
                        const insert = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
                        insert.run("admin", passwordHash);
                        insert.finalize();
                        console.log("Default admin user created (admin/admin123)");
                    }
                });
                stmt.finalize();
            }
        });

        // Connections Table
        db.run(`CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT, -- 'postgres', 'mysql', 'mssql'
      host TEXT,
      port INTEGER,
      username TEXT,
      password TEXT,
      database TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Saved Queries Table
        db.run(`CREATE TABLE IF NOT EXISTS saved_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      query TEXT,
      folder TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
            if (!err) {
                // Try to add folder column if it doesn't exist (for migration)
                db.run("ALTER TABLE saved_queries ADD COLUMN folder TEXT", (err) => {
                    // Ignore error if column already exists
                });
                // Try to add sort_order column
                db.run("ALTER TABLE saved_queries ADD COLUMN sort_order INTEGER DEFAULT 0", (err) => {
                    // Ignore
                });
            }
        });

        // Saved Mappings Table
        db.run(`CREATE TABLE IF NOT EXISTS saved_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connection_id INTEGER,
      table_name TEXT,
      name TEXT,
      mappings TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        const createImportHistoryTable = () => {
            db.run(`CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connection_id INTEGER,
      table_name TEXT,
      file_name TEXT,
      row_count INTEGER,
      error_count INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
        };

        // Folder Metadata Table
        const createFolderMetadataTable = () => {
            db.run(`CREATE TABLE IF NOT EXISTS folder_metadata (
      folder_name TEXT PRIMARY KEY,
      sort_order INTEGER DEFAULT 0
    )`);
        };

        // Execute table creations
        createImportHistoryTable();
        createFolderMetadataTable();
    });
};

module.exports = { db, initDB };
