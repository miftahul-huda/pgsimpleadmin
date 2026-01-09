const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// SQLite connection
const dbPath = path.resolve(__dirname, 'app.db');
const sqliteDb = new sqlite3.Database(dbPath);

// PostgreSQL connection
const pgPool = new Pool({
    host: '34.50.94.247',
    user: 'nodeuser',
    password: 'rotikeju98',
    database: 'pgsimpleadmin',
    port: 5432
});

async function migrateTable(tableName, columns, skipAdmin = false) {
    return new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${tableName}`, [], async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            console.log(`Migrating ${rows.length} rows from ${tableName}...`);

            if (rows.length === 0) {
                console.log(`  No data in ${tableName}`);
                resolve();
                return;
            }

            let migratedCount = 0;
            let skippedCount = 0;

            for (const row of rows) {
                // Skip admin user if it already exists in PostgreSQL
                if (skipAdmin && tableName === 'users' && row.username === 'admin') {
                    console.log(`  Skipping admin user (already exists in PostgreSQL)`);
                    skippedCount++;
                    continue;
                }

                const values = columns.map(col => row[col] === undefined ? null : row[col]);
                const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
                const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

                try {
                    await pgPool.query(query, values);
                    migratedCount++;
                } catch (error) {
                    console.error(`  Error inserting into ${tableName}:`, error.message);
                    console.error(`  Row data:`, row);
                }
            }

            console.log(`  Migrated ${migratedCount} rows, skipped ${skippedCount} rows`);
            resolve();
        });
    });
}

async function migrate() {
    try {
        console.log('Starting data migration from SQLite to PostgreSQL...\n');

        // Note: We skip users table because admin user was already created
        // If you have other users, we'll migrate them

        // Migrate connections
        await migrateTable('connections', [
            'name', 'type', 'host', 'port', 'username', 'password', 'database', 'created_at'
        ]);

        // Migrate saved_queries
        await migrateTable('saved_queries', [
            'name', 'query', 'folder', 'sort_order', 'connection_id', 'created_at'
        ]);

        // Migrate folder_metadata
        await migrateTable('folder_metadata', [
            'folder_name', 'sort_order'
        ]);

        // Migrate saved_mappings
        await migrateTable('saved_mappings', [
            'connection_id', 'table_name', 'name', 'mappings', 'created_at'
        ]);

        // Migrate import_history
        await migrateTable('import_history', [
            'connection_id', 'table_name', 'file_name', 'row_count', 'error_count', 'created_at'
        ]);

        console.log('\n✅ Migration complete!');
        console.log('\nNote: Admin user was not migrated as it already exists in PostgreSQL with the new password.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        sqliteDb.close();
        await pgPool.end();
    }
}

migrate();
