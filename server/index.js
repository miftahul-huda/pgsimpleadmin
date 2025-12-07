const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Internal DB
initDB();

// Routes (to be added)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/explorer', require('./routes/explorer'));
app.use('/api/query', require('./routes/query'));
app.use('/api/import', require('./routes/import'));
app.get('/api/ping', (req, res) => res.json({ message: 'pong', time: new Date().toISOString() }));

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Server updated: Import History route available!');
});
