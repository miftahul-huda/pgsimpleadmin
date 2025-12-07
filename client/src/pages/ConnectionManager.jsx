import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Trash2, Database, Server } from 'lucide-react';

const ConnectionManager = () => {
    const [connections, setConnections] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '', type: 'postgresql', host: 'localhost', port: 5432, username: '', password: '', database: ''
    });

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            const res = await api.get('/connections');
            setConnections(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/connections', formData);
            setShowForm(false);
            fetchConnections();
            setFormData({ name: '', type: 'postgresql', host: 'localhost', port: 5432, username: '', password: '', database: '' });
        } catch (err) {
            alert('Failed to save connection');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure?')) {
            try {
                await api.delete(`/connections/${id}`);
                fetchConnections();
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Connections</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <Plus size={20} /> New Connection
                </button>
            </div>

            {showForm && (
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <h2 style={{ marginTop: 0 }}>Add New Connection</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Connection Name</label>
                            <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Type</label>
                            <select className="input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                <option value="postgresql">PostgreSQL</option>
                                <option value="mysql">MySQL</option>
                                <option value="sqlserver">SQL Server</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Host</label>
                            <input className="input" value={formData.host} onChange={e => setFormData({ ...formData, host: e.target.value })} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Port</label>
                            <input type="number" className="input" value={formData.port} onChange={e => setFormData({ ...formData, port: e.target.value })} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Database</label>
                            <input className="input" value={formData.database} onChange={e => setFormData({ ...formData, database: e.target.value })} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Username</label>
                            <input className="input" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                            <input type="password" className="input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary">Save Connection</button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {connections.map(conn => (
                    <div key={conn.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
                                <Server size={24} color="var(--accent-secondary)" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0 }}>{conn.name}</h3>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{conn.type}</span>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            <div>Host: {conn.host}:{conn.port}</div>
                            <div>User: {conn.username}</div>
                            <div>DB: {conn.database}</div>
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => handleDelete(conn.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', padding: '0.5rem', cursor: 'pointer' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConnectionManager;
