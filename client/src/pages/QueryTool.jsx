import React, { useState, useEffect } from 'react';
import api from '../api';
import { Play, Save, Trash2, Clock, Folder, Edit, ChevronDown, ChevronRight, Download } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import * as XLSX from 'xlsx';

const QueryTool = () => {
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState('');
    const [query, setQuery] = useState('SELECT * FROM ');
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [savedQueries, setSavedQueries] = useState([]);
    const [queryName, setQueryName] = useState('');
    const [folderName, setFolderName] = useState('');
    const [expandedFolders, setExpandedFolders] = useState({});
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    // showFilenameModal, downloadFormat, filename states removed

    const [editingQuery, setEditingQuery] = useState(null);

    useEffect(() => {
        fetchConnections();
        fetchSavedQueries();
    }, []);

    const fetchConnections = async () => {
        try {
            const res = await api.get('/connections');
            setConnections(res.data);
            const saved = localStorage.getItem('lastSelectedConnection');
            if (saved && res.data.find(c => String(c.id) === saved)) {
                setSelectedConnection(saved);
            }
        } catch (err) { console.error(err); }
    };

    const fetchSavedQueries = async () => {
        try {
            const res = await api.get('/query/saved');
            setSavedQueries(res.data);
            const folders = {};
            res.data.forEach(sq => {
                const f = sq.folder || 'Uncategorized';
                folders[f] = true;
            });
            setExpandedFolders(prev => ({ ...folders, ...prev }));
        } catch (err) { console.error(err); }
    };

    const handleRun = async () => {
        if (!selectedConnection) return alert('Select a connection first');
        setLoading(true);
        setError('');
        setResults(null);
        try {
            const res = await api.post(`/query/${selectedConnection}/execute`, { query });
            setResults(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!queryName) return alert('Enter a name for the query');
        try {
            if (editingQuery) {
                await api.put(`/query/saved/${editingQuery.id}`, { name: queryName, query, folder: folderName });
                setEditingQuery(null);
            } else {
                await api.post('/query/saved', { name: queryName, query, folder: folderName });
            }
            setQueryName('');
            // setFolderName(''); 
            fetchSavedQueries();
        } catch (err) {
            alert('Failed to save');
        }
    };

    const handleEdit = (sq) => {
        setEditingQuery(sq);
        setQueryName(sq.name);
        setFolderName(sq.folder || '');
        setQuery(sq.query);
    };

    const handleCancelEdit = () => {
        setEditingQuery(null);
        setQueryName('');
        setFolderName('');
        setQuery('');
    };

    const handleDeleteSaved = async (id) => {
        if (window.confirm('Delete this query?')) {
            try {
                await api.delete(`/query/saved/${id}`);
                fetchSavedQueries();
            } catch (err) { console.error(err); }
        }
    };

    const toggleFolder = (folder) => {
        setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
    };

    const handleDownloadCSV = () => {
        if (!results || !results.fields || results.fields.length === 0) return;
        const defaultFilename = `query_results_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        executeDownload('csv', defaultFilename);
        setShowDownloadModal(false);
    };

    const handleDownloadExcel = () => {
        if (!results || !results.fields || results.fields.length === 0) return;
        const defaultFilename = `query_results_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        executeDownload('xlsx', defaultFilename);
        setShowDownloadModal(false);
    };

    const executeDownload = async (format, filename) => {
        try {
            // Check for File System Access API support
            if ('showSaveFilePicker' in window) {
                const opts = {
                    suggestedName: `${filename}.${format}`,
                    types: format === 'csv' ? [{
                        description: 'CSV File',
                        accept: { 'text/csv': ['.csv'] },
                    }] : [{
                        description: 'Excel File',
                        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
                    }],
                };

                try {
                    const handle = await window.showSaveFilePicker(opts);
                    const writable = await handle.createWritable();

                    if (format === 'csv') {
                        const headers = results.fields.join(',');
                        const rows = results.rows.map(row =>
                            results.fields.map(field => {
                                const value = row[field];
                                if (value === null) return '';
                                const stringValue = String(value);
                                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                                    return '"' + stringValue.replace(/"/g, '""') + '"';
                                }
                                return stringValue;
                            }).join(',')
                        ).join('\n');
                        const csvContent = headers + '\n' + rows;
                        await writable.write(csvContent);
                    } else {
                        const wsData = [
                            results.fields,
                            ...results.rows.map(row => results.fields.map(field => row[field] === null ? '' : row[field]))
                        ];
                        const wb = XLSX.utils.book_new();
                        const ws = XLSX.utils.aoa_to_sheet(wsData);
                        XLSX.utils.book_append_sheet(wb, ws, 'Query Results');
                        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                        await writable.write(new Blob([excelBuffer]));
                    }

                    await writable.close();
                    return; // Succcessfully saved via API
                } catch (err) {
                    if (err.name === 'AbortError') return; // User cancelled
                    console.warn('File System Access API failed, falling back to download:', err);
                    // Fall through to default download
                }
            }
        } catch (err) {
            console.warn('Error in file picker logic:', err);
        }

        // Fallback or default legacy download
        if (format === 'csv') {
            // Create CSV content
            const headers = results.fields.join(',');
            const rows = results.rows.map(row =>
                results.fields.map(field => {
                    const value = row[field];
                    if (value === null) return '';
                    // Escape quotes and wrap in quotes if contains comma, quote, or newline
                    const stringValue = String(value);
                    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                        return '"' + stringValue.replace(/"/g, '""') + '"';
                    }
                    return stringValue;
                }).join(',')
            ).join('\n');

            const csvContent = headers + '\n' + rows;

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            // Create worksheet data
            const wsData = [
                results.fields, // Headers
                ...results.rows.map(row => results.fields.map(field => row[field] === null ? '' : row[field]))
            ];

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Query Results');

            // Generate Excel file and download
            XLSX.writeFile(wb, `${filename}.xlsx`);
        }
    };

    // Group queries by folder
    const groupedQueries = savedQueries.reduce((acc, sq) => {
        const folder = sq.folder || 'Uncategorized';
        if (!acc[folder]) acc[folder] = [];
        acc[folder].push(sq);
        return acc;
    }, {});

    const sortedFolders = Object.keys(groupedQueries).sort();

    // Get unique existing folders for datalist
    const existingFolders = Array.from(new Set(savedQueries.map(sq => sq.folder).filter(Boolean)));

    return (
        <div className="page-container" style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                    {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
                    <Play size={18} /> Run
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => setShowDownloadModal(true)}
                    disabled={!results || !results.fields || results.fields.length === 0}
                >
                    <Download size={18} /> Download
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <input
                        className="input"
                        placeholder="Folder (optional)"
                        value={folderName}
                        onChange={e => setFolderName(e.target.value)}
                        list="folder-list"
                        style={{ width: '150px' }}
                    />
                    <datalist id="folder-list">
                        {existingFolders.map(f => <option key={f} value={f} />)}
                    </datalist>
                    <input
                        className="input"
                        placeholder="Query Name"
                        value={queryName}
                        onChange={e => setQueryName(e.target.value)}
                        style={{ width: '200px' }}
                    />
                    {editingQuery && (
                        <button className="btn btn-secondary" onClick={handleCancelEdit} style={{ marginRight: '0.5rem' }}>
                            Cancel
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={handleSave}>
                        <Save size={18} /> {editingQuery ? 'Update' : 'Save'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                {/* Main Area */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        <CodeMirror
                            value={query}
                            height="200px"
                            theme="dark"
                            extensions={[sql()]}
                            onChange={(value) => setQuery(value)}
                            style={{ fontSize: '1rem' }}
                        />
                    </div>

                    <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {error && <div style={{ padding: '1rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)' }}>{error}</div>}

                        <div style={{ flex: 1, overflow: 'auto' }}>
                            {results && results.fields && results.fields.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                                        <tr>
                                            {results.fields.map(field => (
                                                <th key={field} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{field}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.rows.map((row, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                {results.fields.map(field => (
                                                    <td key={field} style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                                                        {row[field] === null ? <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>NULL</span> : String(row[field])}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : results && results.affectedRows !== undefined ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--success)' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Query Executed Successfully</div>
                                    <div>Affected Rows: {results.affectedRows}</div>
                                </div>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    {loading ? 'Running...' : 'Results will appear here'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Saved Queries Sidebar */}
                <div className="glass-panel" style={{ width: '250px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>Saved Queries</div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                        {sortedFolders.map(folder => (
                            <div key={folder} style={{ marginBottom: '0.5rem' }}>
                                <div
                                    onClick={() => toggleFolder(folder)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.5rem', cursor: 'pointer',
                                        fontWeight: '600', color: 'var(--text-primary)',
                                        background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius)'
                                    }}
                                >
                                    {expandedFolders[folder] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    <Folder size={14} color="var(--accent-primary)" />
                                    {folder}
                                </div>
                                {expandedFolders[folder] && (
                                    <div style={{ paddingLeft: '0.5rem', marginTop: '0.25rem' }}>
                                        {groupedQueries[folder].map(sq => (
                                            <div
                                                key={sq.id}
                                                style={{
                                                    padding: '0.5rem',
                                                    marginBottom: '0.25rem',
                                                    background: 'var(--bg-tertiary)',
                                                    borderRadius: 'var(--radius)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem'
                                                }}
                                                onClick={() => setQuery(sq.query)}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sq.name}</span>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(sq); }}
                                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: 0 }}
                                                            title="Edit"
                                                        >
                                                            <Edit size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteSaved(sq.id); }}
                                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: 0 }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {savedQueries.length === 0 && (
                            <div style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem' }}>
                                No saved queries
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Download Modal */}
            {showDownloadModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: 'var(--bg-secondary)' }}>
                        <h3 style={{ marginTop: 0 }}>Download Query Results</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Select the format for downloading your query results:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleDownloadExcel}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                <Download size={18} /> Download as Excel (.xlsx)
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleDownloadCSV}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                <Download size={18} /> Download as CSV (.csv)
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDownloadModal(false)}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
};

export default QueryTool;
