const express = require('express');
const router = express.Router();
console.log("Import routes module loaded!");

router.use((req, res, next) => {
    console.log(`[Import Route Debug] ${req.method} ${req.url}`);
    next();
});

const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const { pool } = require('../db');
const dbManager = require('../services/dbManager');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET || 'pgsimpleadmin-bucket';

const upload = multer({ dest: 'uploads/' });

// Helper to get connection config
const getConnectionConfig = async (id) => {
    const result = await pool.query("SELECT * FROM connections WHERE id = $1", [id]);
    if (result.rows.length === 0) {
        throw new Error("Connection not found");
    }
    return result.rows[0];
};


router.post('/:connectionId/get-upload-url', async (req, res) => {
    try {
        const { filename, contentType } = req.body;
        console.log(`[GCS Debug] Generating signed URL for: ${filename} in bucket: ${BUCKET_NAME}`);
        
        if (!filename) return res.status(400).json({ error: 'filename required' });

        const gcsFileName = `uploads/${Date.now()}-${filename}`;
        const file = storage.bucket(BUCKET_NAME).file(gcsFileName);
        
        // Expires in 15 minutes
        const expires = Date.now() + 15 * 60 * 1000;

        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: expires,
            contentType: contentType || 'application/octet-stream',
        });

        res.json({ uploadUrl: url, gcsFileName });
    } catch (err) {
        console.error("[GCS Debug] Signed URL error:", err);
        res.status(500).json({ 
            error: err.message, 
            details: "Ensure the bucket exists and the service account has 'Storage Object Creator' permissions. If running locally, ensure GOOGLE_APPLICATION_CREDENTIALS is set."
        });
    }
});

router.post('/:connectionId/upload', upload.single('file'), async (req, res) => {
    let filePath;
    let isGcs = false;
    let gcsFileName;
    console.log(`[Import Route Debug] POST /upload for connection: ${req.params.connectionId}`);

    if (req.file) {
        console.log(`[Import Route Debug] Standard multipart upload: ${req.file.originalname}`);
        filePath = req.file.path;
    } else if (req.body.gcsFileName) {
        gcsFileName = req.body.gcsFileName;
        isGcs = true;
        console.log(`[Import Route Debug] GCS-based upload: ${gcsFileName}`);
        // Download from GCS to local uploads for processing
        filePath = `uploads/${gcsFileName.split('/').pop()}`;
        try {
            console.log(`[Import Route Debug] Downloading from GCS: ${gcsFileName} to ${filePath}`);
            await storage.bucket(BUCKET_NAME).file(gcsFileName).download({ destination: filePath });
            console.log(`[Import Route Debug] GCS Download complete`);
        } catch (err) {
            console.error(`[Import Route Debug] GCS Download failed:`, err);
            return res.status(500).json({ error: `Failed to download from GCS: ${err.message}` });
        }
    } else {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const isCsv = isGcs ? filePath.toLowerCase().endsWith('.csv') : (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv'));
        
        if (isCsv) {
            const results = [];
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => {
                    // fs.unlinkSync(filePath); // Keep file for execution
                    if (results.length > 0) {
                        res.json({
                            headers: Object.keys(results[0]),
                            preview: results.slice(0, 5),
                            totalRows: results.length,
                            fileId: isGcs ? gcsFileName : req.file.filename,
                            sheets: [] // CSV has no sheets
                        });
                    } else {
                        res.json({ headers: [], preview: [], fileId: isGcs ? gcsFileName : req.file.filename, sheets: [] });
                    }
                });
        } else {
            // XLSX
            console.log(`[Import Route Debug] Parsing XLSX file: ${filePath}`);
            const workbook = xlsx.readFile(filePath);
            const sheets = workbook.SheetNames;
            console.log(`[Import Route Debug] Sheets found: ${sheets.join(', ')}`);
            const sheetName = sheets[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);
            // fs.unlinkSync(filePath); // Keep file

            res.json({
                headers: data.length > 0 ? Object.keys(data[0]) : [],
                preview: data.slice(0, 5),
                totalRows: data.length,
                fileId: isGcs ? gcsFileName : req.file.filename,
                sheets: sheets,
                currentSheet: sheetName
            });
        }
    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ error: err.message });
    }
});

router.post('/:connectionId/sheet-preview', async (req, res) => {
    const { fileId, sheetName } = req.body;
    let filePath;
    let isGcs = false;

    if (fileId && fileId.startsWith('uploads/')) {
        // It's a GCS path
        isGcs = true;
        filePath = `uploads/${fileId.split('/').pop()}`;
        if (!fs.existsSync(filePath)) {
            // Need to re-download if not present locally
            try {
                await storage.bucket(BUCKET_NAME).file(fileId).download({ destination: filePath });
            } catch (err) {
                return res.status(500).json({ error: `Failed to download from GCS: ${err.message}` });
            }
        }
    } else {
        filePath = `uploads/${fileId}`;
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File session expired or not found' });
    }

    try {
        const workbook = xlsx.readFile(filePath);
        if (!workbook.SheetNames.includes(sheetName)) {
            return res.status(400).json({ error: 'Sheet not found' });
        }

        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        res.json({
            headers: data.length > 0 ? Object.keys(data[0]) : [],
            preview: data.slice(0, 5),
            totalRows: data.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:connectionId/execute-import', async (req, res) => {
    const { table, mappings, data, fileId, sheetName } = req.body;
    const connectionId = req.params.connectionId;

    let conn;
    let rowsToImport = data || [];

    try {
        // If fileId is present, read from file for FULL import
        if (fileId) {
            let filePath;
            if (fileId.startsWith('uploads/')) {
                // GCS
                filePath = `uploads/${fileId.split('/').pop()}`;
                if (!fs.existsSync(filePath)) {
                    try {
                        await storage.bucket(BUCKET_NAME).file(fileId).download({ destination: filePath });
                    } catch (err) {
                        console.error("GCS Download failed in execute-import:", err);
                    }
                }
            } else {
                filePath = `uploads/${fileId}`;
            }

            if (fs.existsSync(filePath)) {
                if (filePath.endsWith('.csv') || filePath.endsWith('.CSV') /* Logic to detect CSV if needed, but multer saves without ext usually. We can check mimetype or just try parsing */) {
                    // For simplicity, if it was uploaded as CSV, we treat as CSV. 
                    // But we didn't store mimetype. Let's rely on the fact that XLSX throws error if not XLSX?
                    // Or better, check if sheetName is provided. CSVs don't have sheetName usually (or we sent empty).
                }

                // Let's try to read as workbook first if sheetName is provided
                if (sheetName) {
                    const workbook = xlsx.readFile(filePath);
                    const sheet = workbook.Sheets[sheetName];
                    rowsToImport = xlsx.utils.sheet_to_json(sheet);
                } else {
                    // CSV fallback or if no sheet selected (implies CSV)
                    // We need to re-read CSV. 
                    // Since `csv-parser` is stream based, we need to wrap in promise
                    const results = [];
                    await new Promise((resolve, reject) => {
                        fs.createReadStream(filePath)
                            .pipe(csv())
                            .on('data', (data) => results.push(data))
                            .on('end', () => {
                                rowsToImport = results;
                                resolve();
                            })
                            .on('error', reject);
                    });
                }

                // Clean up file after reading
                fs.unlinkSync(filePath);
            }
        }

        const config = await getConnectionConfig(connectionId);
        conn = await dbManager.connect(config);

        await dbManager.beginTransaction(conn);

        const dbColumns = Object.values(mappings);
        const csvColumns = Object.keys(mappings);

        let successCount = 0;
        let errorCount = 0;

        // Bulk insert in chunks
        const BATCH_SIZE = 1000;
        for (let i = 0; i < rowsToImport.length; i += BATCH_SIZE) {
            const batch = rowsToImport.slice(i, i + BATCH_SIZE);

            const values = [];
            const placeholders = [];
            let paramIndex = 1;

            for (const row of batch) {
                const rowValues = csvColumns.map(col => {
                    let val = row[col];
                    if (val === undefined || val === 'NULL' || val === '') return null;
                    return val;
                });
                values.push(...rowValues);

                const rowPlaceholders = rowValues.map(() => {
                    if (config.type === 'postgresql') return `$${paramIndex++}`;
                    return '?';
                });
                placeholders.push(`(${rowPlaceholders.join(', ')})`);
            }

            if (placeholders.length === 0) continue;

            let query = "";
            if (config.type === 'postgresql') {
                query = `INSERT INTO "${table}" ("${dbColumns.join('", "')}") VALUES ${placeholders.join(', ')}`;
            } else {
                query = `INSERT INTO ${table} (${dbColumns.join(', ')}) VALUES ${placeholders.join(', ')}`;
            }

            try {
                await dbManager.executeQuery(conn, query, values);
                successCount += batch.length;
            } catch (err) {
                console.error("Import batch error:", err);
                // If a batch fails, we could try row-by-row or just fail the batch.
                // For now, let's fail the batch and count errors.
                // But since we are in a transaction, a failure might abort the transaction depending on DB.
                // For Postgres, a failed query aborts the transaction.
                // So we should probably rollback the whole thing if any batch fails, OR
                // if we want partial success, we can't use a single transaction for everything.
                // Requirement was "make it faster". Bulk insert is the key.
                // If we want robust error handling, we might need savepoints or just fail all.
                // Let's assume we fail all on error for now to keep data consistent.
                errorCount += batch.length;
                throw err; // Re-throw to trigger rollback
            }
        }

        await dbManager.commit(conn);

        // Record history
        await pool.query(
            "INSERT INTO import_history (connection_id, table_name, file_name, row_count, error_count) VALUES ($1, $2, $3, $4, $5)",
            [connectionId, table, fileId || 'Unknown File', successCount, errorCount]
        );

        res.json({ success: true, successCount, errorCount });

    } catch (err) {
        if (conn) await dbManager.rollback(conn);
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) await dbManager.close(conn);
    }
});

router.get('/:connectionId/history', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const result = await pool.query(
            "SELECT * FROM import_history WHERE connection_id = $1 ORDER BY created_at DESC",
            [connectionId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:connectionId/history/:tableName', async (req, res) => {
    try {
        const { connectionId, tableName } = req.params;
        const result = await pool.query(
            "SELECT * FROM import_history WHERE connection_id = $1 AND table_name = $2 ORDER BY created_at DESC",
            [connectionId, tableName]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:connectionId/mappings/:tableName', async (req, res) => {
    try {
        const { connectionId, tableName } = req.params;
        const result = await pool.query(
            "SELECT * FROM saved_mappings WHERE connection_id = $1 AND table_name = $2 ORDER BY created_at DESC",
            [connectionId, tableName]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:connectionId/mappings', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { tableName, name, mappings } = req.body;

        const result = await pool.query(
            "INSERT INTO saved_mappings (connection_id, table_name, name, mappings) VALUES ($1, $2, $3, $4) RETURNING *",
            [connectionId, tableName, name, JSON.stringify(mappings)]
        );
        res.json({ id: result.rows[0].id, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
