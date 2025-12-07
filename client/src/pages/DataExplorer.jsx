import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Database, Table as TableIcon, RefreshCw, Upload } from 'lucide-react';
import ImportModal from '../components/ImportModal';

const DataExplorer = () => {
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState('');
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [data, setData] = useState({ rows: [], fields: [] });
    const [loading, setLoading] = useState(false);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, tableName: '' });
    const [showImportModal, setShowImportModal] = useState(false);
    const contextMenuRef = useRef(null);

    useEffect(() => {
        fetchConnections();

        // Close context menu on click outside
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    useEffect(() => {
        if (selectedConnection) {
            fetchTables(selectedConnection);
            setSelectedTable('');
            setData({ rows: [], fields: [] });
        }
    }, [selectedConnection]);

    useEffect(() => {
        if (selectedConnection && selectedTable) {
            fetchData(selectedConnection, selectedTable);
        }
    }, [selectedTable]);

    const fetchConnections = async () => {
        try {
            const res = await api.get('/connections');
            setConnections(res.data);
            const saved = localStorage.getItem('lastSelectedConnection');
            if (saved && res.data.find(c => String(c.id) === saved)) {
                setSelectedConnection(saved);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTables = async (connId) => {
        setLoading(true);
        try {
            const res = await api.get(`/explorer/${connId}/tables`);
            setTables(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async (connId, table) => {
        setLoading(true);
        try {
            const res = await api.post(`/explorer/${connId}/query`, { query: `SELECT * FROM ${table} LIMIT 100` });
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleContextMenu = (e, table) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            tableName: table
        });
    };

    const handleImportClick = () => {
        setSelectedTable(contextMenu.tableName); // Optional: select the table in view too
        setShowImportModal(true);
        setContextMenu({ ...contextMenu, visible: false });
    };

    return (
        <div className="page-container" style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <select
                    className="input"
                    style={{ width: '350px' }}
                    value={selectedConnection}
                    onChange={(e) => {
                        setSelectedConnection(e.target.value);
                        localStorage.setItem('lastSelectedConnection', e.target.value);
                    }}
                >
                    <option value="">Select Connection...</option>
                    {connections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                </select>
                {loading && <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}><RefreshCw className="spin" size={20} /></div>}
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                {/* Tables List */}
                <div className="glass-panel" style={{ width: '250px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Tables</div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                        {tables.map(table => (
                            <div
                                key={table}
                                onClick={() => setSelectedTable(table)}
                                onContextMenu={(e) => handleContextMenu(e, table)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius)',
                                    background: selectedTable === table ? 'var(--accent-primary)' : 'transparent',
                                    color: selectedTable === table ? 'white' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    marginBottom: '2px'
                                }}
                            >
                                <TableIcon size={16} />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{table}</span>
                            </div>
                        ))}
                        {tables.length === 0 && selectedConnection && !loading && (
                            <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No tables found</div>
                        )}
                    </div>
                </div>

                {/* Data View */}
                <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{selectedTable || 'Select a table'}</span>
                        {data.rows.length > 0 && <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Showing first 100 rows</span>}
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {selectedTable && data.fields.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                                    <tr>
                                        {data.fields.map(field => (
                                            <th key={field} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{field}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.rows.map((row, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                            {data.fields.map(field => (
                                                <td key={field} style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                                                    {row[field] === null ? <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>NULL</span> : String(row[field])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                {selectedTable ? 'No data or loading...' : 'Select a table to view data'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    ref={contextMenuRef}
                    style={{
                        position: 'absolute',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        zIndex: 1000,
                        padding: '0.5rem',
                        minWidth: '150px'
                    }}
                >
                    <div
                        onClick={handleImportClick}
                        style={{
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            borderRadius: '4px',
                            color: 'var(--text-primary)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Upload size={16} />
                        Import Data
                    </div>
                </div>
            )}

            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                connectionId={selectedConnection}
                tableName={contextMenu.tableName || selectedTable}
                onSuccess={() => {
                    // Refresh data if the imported table is the currently viewed one
                    if (selectedTable === (contextMenu.tableName || selectedTable)) {
                        fetchData(selectedConnection, selectedTable);
                    }
                }}
            />
        </div>
    );
};

export default DataExplorer;
