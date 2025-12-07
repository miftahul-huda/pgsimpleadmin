const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Get all connections
router.get('/', (req, res) => {
    db.all("SELECT id, name, type, host, port, username, database, created_at FROM connections", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add connection
router.post('/', (req, res) => {
    const { name, type, host, port, username, password, database } = req.body;
    const sql = "INSERT INTO connections (name, type, host, port, username, password, database) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const params = [name, type, host, port, username, password, database];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, ...req.body });
    });
});

// Delete connection
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM connections WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted', changes: this.changes });
    });
});

module.exports = router;
