import React from 'react';

const Dashboard = () => {
    return (
        <div className="page-container">
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Dashboard</h1>
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    Welcome to PGSimple Admin. Select a tool from the sidebar to get started.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <h3 style={{ marginTop: 0 }}>Manage Connections</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Configure access to PostgreSQL, MySQL, and SQL Server databases.</p>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <h3 style={{ marginTop: 0 }}>Explore Data</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Browse tables, view data, and analyze schema structures.</p>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <h3 style={{ marginTop: 0 }}>Run Queries</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Execute raw SQL queries and save them for later use.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
