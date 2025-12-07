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
                    multipleStatements: true
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
                let res;
                if (params && params.length > 0) {
                    res = await conn.query(query, params);
                } else {
                    res = await conn.query(query);
                }

                // Handle multiple statements (pg returns array of results)
                const result = Array.isArray(res) ? res[res.length - 1] : res;

                return {
                    rows: result.rows || [],
                    fields: result.fields ? result.fields.map(f => f.name) : [],
                    affectedRows: result.rowCount
                };
            } else if (type === 'mysql') {
                // Use .query instead of .execute to support multiple statements
                const [rows, fields] = await conn.query(query, params);

                // Handle multiple results
                // If multiple statements, rows is Array of (Arrays or ResultSetHeaders)
                // If single SELECT, rows is Array of RowDataPackets
                // If single INSERT/UPDATE, rows is ResultSetHeader (Object)
                let resultRows = rows;
                let resultFields = fields;

                if (Array.isArray(rows)) {
                    // Check if it's a multi-statement result
                    // If the first item is an Array (SELECT result) or ResultSetHeader (UPDATE result)
                    if (rows.length > 0 && (Array.isArray(rows[0]) || (rows[0].constructor && rows[0].constructor.name === 'ResultSetHeader'))) {
                        // It's likely a multi-result. Return the last one.
                        const lastIndex = rows.length - 1;
                        resultRows = rows[lastIndex];
                        resultFields = Array.isArray(fields) ? fields[lastIndex] : fields;
                    }
                }

                if (Array.isArray(resultRows)) {
                    return {
                        rows: resultRows,
                        fields: resultFields ? resultFields.map(f => f.name) : [],
                        affectedRows: resultRows.length
                    };
                } else {
                    // ResultSetHeader
                    return {
                        rows: [],
                        fields: [],
                        affectedRows: resultRows.affectedRows
                    };
                }
            } else if (type === 'sqlserver') {
                const res = await conn.request().query(query);
                // mssql returns recordsets array for multiple queries
                const recordset = res.recordsets && res.recordsets.length > 0 ? res.recordsets[res.recordsets.length - 1] : [];
                const fields = recordset.columns ? Object.keys(recordset.columns) : (recordset.length > 0 ? Object.keys(recordset[0]) : []);

                return {
                    rows: recordset,
                    fields,
                    affectedRows: res.rowsAffected ? res.rowsAffected.reduce((a, b) => a + b, 0) : 0
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
