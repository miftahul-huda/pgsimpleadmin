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

// Get all saved queries and folder metadata
router.get('/saved', (req, res) => {
    const response = {};
    db.all("SELECT * FROM saved_queries ORDER BY sort_order ASC, created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        response.queries = rows;

        db.all("SELECT * FROM folder_metadata ORDER BY sort_order ASC", [], (err, meta) => {
            if (err) return res.status(500).json({ error: err.message });
            response.folders = meta;
            res.json(response);
        });
    });
});

// Rename folder
router.post('/saved/folder/rename', (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'Old and new names are required' });

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Update queries
        db.run("UPDATE saved_queries SET folder = ? WHERE folder = ?", [newName, oldName], (err) => {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }

            // Update metadata if exists, or insert ignore?
            // SQLite doesn't have easiest UPSERT, but let's try updating if exists
            db.run("INSERT OR IGNORE INTO folder_metadata (folder_name, sort_order) VALUES (?, 0)", [newName], (err) => {
                // If old one existed, we might want its order?
                // Simple approach: Update old metadata record to new name
                db.run("UPDATE folder_metadata SET folder_name = ? WHERE folder_name = ?", [newName, oldName], (err) => {
                    db.run("COMMIT", (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ success: true });
                    });
                });
            });
        });
    });
});

// Reorder folders
router.post('/saved/folder/reorder', (req, res) => {
    const { folders } = req.body; // [{ name, sort_order }]
    if (!Array.isArray(folders)) return res.status(400).json({ error: 'Invalid folders array' });

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare("INSERT OR REPLACE INTO folder_metadata (folder_name, sort_order) VALUES (?, ?)");

        folders.forEach(f => {
            stmt.run(f.name, f.sort_order);
        });

        stmt.finalize();
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// Save a query
router.post('/saved', (req, res) => {
    const { name, query, folder, connectionId } = req.body;
    if (!name || !query) return res.status(400).json({ error: 'Name and query are required' });

    // Get max sort_order
    db.get("SELECT MAX(sort_order) as maxOrder FROM saved_queries WHERE folder = ?", [folder || null], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const nextOrder = (row && row.maxOrder !== null) ? row.maxOrder + 1 : 0;

        db.run("INSERT INTO saved_queries (name, query, folder, connection_id, sort_order) VALUES (?, ?, ?, ?, ?)", [name, query, folder, connectionId || null, nextOrder], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, name, query, folder, connectionId: connectionId || null, sort_order: nextOrder });
        });
    });
});

// Reorder queries
router.post('/saved/reorder', (req, res) => {
    const { items } = req.body; // Array of { id, sort_order }
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid items array' });

    const dbSerialize = db.serialize.bind(db);
    dbSerialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare("UPDATE saved_queries SET sort_order = ? WHERE id = ?");

        items.forEach(item => {
            stmt.run(item.sort_order, item.id);
        });

        stmt.finalize();
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

router.put('/saved/:id', (req, res) => {
    const { name, query, folder, connectionId } = req.body;
    db.run("UPDATE saved_queries SET name = ?, query = ?, folder = ?, connection_id = ? WHERE id = ?", [name, query, folder, connectionId, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Updated', id: req.params.id, name, query, folder, connectionId });
    });
});

router.delete('/saved/folder/:folder', (req, res) => {
    const folder = req.params.folder;
    let query = "DELETE FROM saved_queries WHERE folder = ?";
    let params = [folder];

    if (folder === 'Uncategorized') {
        query = "DELETE FROM saved_queries WHERE folder = ? OR folder IS NULL OR folder = ''";
    }

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Folder deleted', changes: this.changes });
    });
});

router.delete('/saved/:id', (req, res) => {
    db.run("DELETE FROM saved_queries WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

module.exports = router;
