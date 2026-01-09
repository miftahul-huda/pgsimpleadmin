const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const dbManager = require('../services/dbManager');

// Helper to get connection config
const getConnectionConfig = async (id) => {
    const result = await pool.query("SELECT * FROM connections WHERE id = $1", [id]);
    if (result.rows.length === 0) {
        throw new Error("Connection not found");
    }
    return result.rows[0];
};

router.get('/:connectionId/tables', async (req, res) => {
    let conn;
    try {
        const config = await getConnectionConfig(req.params.connectionId);
        conn = await dbManager.connect(config);
        const tables = await dbManager.listTables(conn);
        res.json(tables);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) await dbManager.close(conn);
    }
});

router.get('/:connectionId/columns/:tableName', async (req, res) => {
    let conn;
    try {
        const config = await getConnectionConfig(req.params.connectionId);
        conn = await dbManager.connect(config);
        const columns = await dbManager.listColumns(conn, req.params.tableName);
        res.json(columns);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) await dbManager.close(conn);
    }
});

router.post('/:connectionId/query', async (req, res) => {
    let conn;
    try {
        const config = await getConnectionConfig(req.params.connectionId);
        const { query } = req.body;
        conn = await dbManager.connect(config);
        const result = await dbManager.executeQuery(conn, query);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) await dbManager.close(conn);
    }
});

module.exports = router;
