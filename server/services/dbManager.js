const { Client } = require('pg');
const mysql = require('mysql2/promise');
const sql = require('mssql');

class DBManager {
    constructor() { }

    async connect(config) {
        let connection;
        try {
            if (config.type === 'postgresql') {
                connection = new Client({
                    user: config.username,
                    host: config.host,
                    database: config.database,
                    password: config.password,
                    port: parseInt(config.port),
                });
                await connection.connect();
                return { type: 'postgresql', conn: connection };
            } else if (config.type === 'mysql') {
                connection = await mysql.createConnection({
                    host: config.host,
                    user: config.username,
                    password: config.password,
                    database: config.database,
                    port: parseInt(config.port),
                });
                return { type: 'mysql', conn: connection };
            } else if (config.type === 'sqlserver') {
                const sqlConfig = {
                    user: config.username,
                    password: config.password,
                    database: config.database,
                    server: config.host,
                    port: parseInt(config.port),
                    options: {
                        encrypt: false, // Use true for Azure
                        trustServerCertificate: true // Change to true for local dev / self-signed certs
                    }
                };
                connection = await sql.connect(sqlConfig);
                return { type: 'sqlserver', conn: connection };
            }
        } catch (err) {
            console.error("Connection failed:", err);
            throw new Error(`Failed to connect to ${config.type}: ${err.message}`);
        }
    }

    async listTables(connection) {
        const { type, conn } = connection;
        if (type === 'postgresql') {
            const res = await conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            return res.rows.map(r => r.table_name);
        } else if (type === 'mysql') {
            const [rows] = await conn.execute("SHOW TABLES");
            return rows.map(r => Object.values(r)[0]);
        } else if (type === 'sqlserver') {
            const res = await conn.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
            return res.recordset.map(r => r.TABLE_NAME);
        }
    }

    async listColumns(connection, tableName) {
        const { type, conn } = connection;
        if (type === 'postgresql') {
            const res = await conn.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [tableName]);
            return res.rows.map(r => r.column_name);
        } else if (type === 'mysql') {
            const [rows] = await conn.execute(`SHOW COLUMNS FROM ${tableName}`);
            return rows.map(r => r.Field);
        } else if (type === 'sqlserver') {
            const res = await conn.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`);
            return res.recordset.map(r => r.COLUMN_NAME);
        }
    }

    async executeQuery(connection, query, params = []) {
        const { type, conn } = connection;
        try {
            if (type === 'postgresql') {
                const res = await conn.query(query, params);
                return {
                    rows: res.rows,
                    fields: res.fields ? res.fields.map(f => f.name) : [],
                    affectedRows: res.rowCount
                };
            } else if (type === 'mysql') {
                const [rows, fields] = await conn.execute(query, params);
                if (Array.isArray(rows)) {
                    return {
                        rows,
                        fields: fields.map(f => f.name),
                        affectedRows: rows.length
                    };
                } else {
                    // For INSERT/UPDATE/DELETE, rows is an object with affectedRows
                    return {
                        rows: [],
                        fields: [],
                        affectedRows: rows.affectedRows
                    };
                }
            } else if (type === 'sqlserver') {
                const res = await conn.request().query(query);
                const fields = res.recordset && res.recordset.length > 0 ? Object.keys(res.recordset[0]) : [];
                return {
                    rows: res.recordset || [],
                    fields,
                    affectedRows: res.rowsAffected[0]
                };
            }
        } catch (err) {
            throw new Error(err.message);
        }
    }

    async close(connection) {
        const { type, conn } = connection;
        if (type === 'postgresql') {
            await conn.end();
        } else if (type === 'mysql') {
            await conn.end();
        } else if (type === 'sqlserver') {
            await conn.close();
        }
    }

    async beginTransaction(connection) {
        const { type, conn } = connection;
        if (type === 'postgresql') {
            await conn.query('BEGIN');
        } else if (type === 'mysql') {
            await conn.beginTransaction();
        } else if (type === 'sqlserver') {
            const transaction = new sql.Transaction(conn);
            await transaction.begin();
            connection.transaction = transaction; // Store transaction object
        }
    }

    async commit(connection) {
        const { type, conn } = connection;
        if (type === 'postgresql') {
            await conn.query('COMMIT');
        } else if (type === 'mysql') {
            await conn.commit();
        } else if (type === 'sqlserver') {
            if (connection.transaction) {
                await connection.transaction.commit();
                delete connection.transaction;
            }
        }
    }

    async rollback(connection) {
        const { type, conn } = connection;
        if (type === 'postgresql') {
            await conn.query('ROLLBACK');
        } else if (type === 'mysql') {
            await conn.rollback();
        } else if (type === 'sqlserver') {
            if (connection.transaction) {
                await connection.transaction.rollback();
                delete connection.transaction;
            }
        }
    }
}

module.exports = new DBManager();
