const express = require('express');
const router = express.Router();
const { db } = require('../db');
const dbManager = require('../services/dbManager');

// Helper to get connection config
const getConnectionConfig = (id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM connections WHERE id = ?", [id], (err, row) => {
            if (err) reject(err);
            if (!row) reject(new Error("Connection not found"));
            resolve(row);
        });
    });
};

// Execute Query
router.post('/:connectionId/execute', async (req, res) => {
    let conn;
    try {
        const config = await getConnectionConfig(req.params.connectionId);
        const { query } = req.body;
        conn = await dbManager.connect(config);

        // Simple pagination could be done here or in the SQL, but for raw SQL it's hard to inject LIMIT/OFFSET safely without parsing.
        // For MVP, we'll fetch all (or limit 1000) and let frontend paginate or user write LIMIT.
        // We can append " LIMIT 1000" if it's a SELECT and doesn't have limit? Too risky.
        // Let's just run it.

        const result = await dbManager.executeQuery(conn, query);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) await dbManager.close(conn);
    }
});

// Saved Queries CRUD
router.get('/saved', (req, res) => {
    db.all("SELECT * FROM saved_queries ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/saved', (req, res) => {
    const { name, query, folder } = req.body;
    db.run("INSERT INTO saved_queries (name, query, folder) VALUES (?, ?, ?)", [name, query, folder], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, query, folder });
    });
});

router.put('/saved/:id', (req, res) => {
    const { name, query, folder } = req.body;
    db.run("UPDATE saved_queries SET name = ?, query = ?, folder = ? WHERE id = ?", [name, query, folder, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Updated', id: req.params.id, name, query, folder });
    });
});

router.delete('/saved/:id', (req, res) => {
    db.run("DELETE FROM saved_queries WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

module.exports = router;
