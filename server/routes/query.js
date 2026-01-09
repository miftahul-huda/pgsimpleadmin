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

// Execute Query
router.post('/:connectionId/execute', async (req, res) => {
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

// Get all saved queries and folder metadata
router.get('/saved', async (req, res) => {
    try {
        const queriesResult = await pool.query(
            "SELECT * FROM saved_queries ORDER BY sort_order ASC, created_at DESC"
        );
        const foldersResult = await pool.query(
            "SELECT * FROM folder_metadata ORDER BY sort_order ASC"
        );

        res.json({
            queries: queriesResult.rows,
            folders: foldersResult.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rename folder
router.post('/saved/folder/rename', async (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'Old and new names are required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update queries
        await client.query(
            "UPDATE saved_queries SET folder = $1 WHERE folder = $2",
            [newName, oldName]
        );

        // Update metadata - insert if not exists, then update
        await client.query(
            "INSERT INTO folder_metadata (folder_name, sort_order) VALUES ($1, 0) ON CONFLICT (folder_name) DO NOTHING",
            [newName]
        );

        await client.query(
            "UPDATE folder_metadata SET folder_name = $1 WHERE folder_name = $2",
            [newName, oldName]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Reorder folders
router.post('/saved/folder/reorder', async (req, res) => {
    const { folders } = req.body; // [{ name, sort_order }]
    if (!Array.isArray(folders)) return res.status(400).json({ error: 'Invalid folders array' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const f of folders) {
            await client.query(
                `INSERT INTO folder_metadata (folder_name, sort_order) 
                 VALUES ($1, $2) 
                 ON CONFLICT (folder_name) 
                 DO UPDATE SET sort_order = $2`,
                [f.name, f.sort_order]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Save a query
router.post('/saved', async (req, res) => {
    try {
        const { name, query, folder, connectionId } = req.body;
        console.log('POST /saved Request Body:', req.body);
        if (!name || !query) return res.status(400).json({ error: 'Name and query are required' });

        // Get max sort_order
        const maxOrderResult = await pool.query(
            "SELECT MAX(sort_order) as maxorder FROM saved_queries WHERE folder = $1 OR (folder IS NULL AND $1 IS NULL)",
            [folder || null]
        );
        const nextOrder = (maxOrderResult.rows[0] && maxOrderResult.rows[0].maxorder !== null)
            ? maxOrderResult.rows[0].maxorder + 1
            : 0;

        const result = await pool.query(
            "INSERT INTO saved_queries (name, query, folder, connection_id, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name, query, folder, connectionId || null, nextOrder]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reorder queries
router.post('/saved/reorder', async (req, res) => {
    const { items } = req.body; // Array of { id, sort_order }
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid items array' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const item of items) {
            await client.query(
                "UPDATE saved_queries SET sort_order = $1 WHERE id = $2",
                [item.sort_order, item.id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.put('/saved/:id', async (req, res) => {
    try {
        const { name, query, folder, connectionId } = req.body;
        await pool.query(
            "UPDATE saved_queries SET name = $1, query = $2, folder = $3, connection_id = $4 WHERE id = $5",
            [name, query, folder, connectionId, req.params.id]
        );
        res.json({ message: 'Updated', id: req.params.id, name, query, folder, connectionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/saved/folder/:folder', async (req, res) => {
    try {
        const folder = req.params.folder;
        let query = "DELETE FROM saved_queries WHERE folder = $1";
        let params = [folder];

        if (folder === 'Uncategorized') {
            query = "DELETE FROM saved_queries WHERE folder = $1 OR folder IS NULL OR folder = ''";
        }

        const result = await pool.query(query, params);
        res.json({ message: 'Folder deleted', changes: result.rowCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/saved/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM saved_queries WHERE id = $1", [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
