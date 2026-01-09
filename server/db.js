const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
    host: process.env.DB_HOST || '34.50.94.247',
    user: process.env.DB_USER || 'nodeuser',
    password: process.env.DB_PASSWORD || 'rotikeju98',
    database: process.env.DB_NAME || 'pgsimpleadmin',
    port: parseInt(process.env.DB_PORT) || 5432
});

// Test connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database.');
});

pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
});

const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if admin user exists
        const adminCheck = await client.query(
            "SELECT * FROM users WHERE username = $1",
            ["admin"]
        );

        if (adminCheck.rows.length === 0) {
            const passwordHash = bcrypt.hashSync("admin123", 10);
            await client.query(
                "INSERT INTO users (username, password) VALUES ($1, $2)",
                ["admin", passwordHash]
            );
            console.log("Default admin user created (admin/admin123)");
        }

        // Connections Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS connections (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                type VARCHAR(50), -- 'postgres', 'mysql', 'mssql'
                host VARCHAR(255),
                port INTEGER,
                username VARCHAR(255),
                password VARCHAR(255),
                database VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Saved Queries Table (with all columns from start)
        await client.query(`
            CREATE TABLE IF NOT EXISTS saved_queries (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                query TEXT,
                folder VARCHAR(255),
                sort_order INTEGER DEFAULT 0,
                connection_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Saved Mappings Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS saved_mappings (
                id SERIAL PRIMARY KEY,
                connection_id INTEGER,
                table_name VARCHAR(255),
                name VARCHAR(255),
                mappings TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Import History Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS import_history (
                id SERIAL PRIMARY KEY,
                connection_id INTEGER,
                table_name VARCHAR(255),
                file_name VARCHAR(255),
                row_count INTEGER,
                error_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Folder Metadata Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS folder_metadata (
                folder_name VARCHAR(255) PRIMARY KEY,
                sort_order INTEGER DEFAULT 0
            )
        `);

        await client.query('COMMIT');
        console.log('Database tables initialized successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error initializing database:', err);
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { pool, initDB };
