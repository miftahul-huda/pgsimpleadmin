const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Get all connections
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, type, host, port, username, database, created_at FROM connections"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add connection
router.post('/', async (req, res) => {
    try {
        const { name, type, host, port, username, password, database } = req.body;
        const sql = `
            INSERT INTO connections (name, type, host, port, username, password, database) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `;
        const params = [name, type, host, port, username, password, database];

        const result = await pool.query(sql, params);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete connection
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM connections WHERE id = $1",
            [req.params.id]
        );
        res.json({ message: 'Deleted', changes: result.rowCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
