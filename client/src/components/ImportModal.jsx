import React, { useState, useEffect } from 'react';
import api from '../api';
import { Upload, Check, AlertTriangle, X } from 'lucide-react';
import { findBestMatch } from '../utils/stringUtils';

const ImportModal = ({ isOpen, onClose, connectionId, tableName, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState({ headers: [], rows: [] });

    const [dbColumns, setDbColumns] = useState([]);
    const [mappings, setMappings] = useState({}); // { csvHeader: dbColumn }

    const [importResult, setImportResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const [sheets, setSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState('');
    const [fileId, setFileId] = useState(null);

    const [savedMappings, setSavedMappings] = useState([]);

    const [showSaveModal, setShowSaveModal] = useState(false);
    const [templateName, setTemplateName] = useState('');



    const fetchSavedMappings = async () => {
        try {
            const res = await api.get(`/import/${connectionId}/mappings/${tableName}`);
            if (Array.isArray(res.data)) {
                setSavedMappings(res.data);
            } else {
                setSavedMappings([]);
            }
        } catch (err) {
            console.error(err);
            setSavedMappings([]);
        }
    };

    const handleSaveMapping = () => {
        setTemplateName('');
        setShowSaveModal(true);
    };

    const confirmSaveMapping = async () => {
        if (!templateName) return alert("Please enter a template name");

        try {
            await api.post(`/import/${connectionId}/mappings`, {
                tableName,
                name: templateName,
                mappings
            });
            alert("Mapping saved!");
            setShowSaveModal(false);
            fetchSavedMappings();
        } catch (err) {
            alert("Failed to save mapping: " + err.message);
        }
    };

    const handleLoadMapping = (e) => {
        const mappingId = e.target.value;
        if (!mappingId) return;

        const mapping = savedMappings.find(m => m.id === parseInt(mappingId));
        if (mapping) {
            try {
                const loadedMappings = JSON.parse(mapping.mappings);
                setMappings(loadedMappings);
            } catch (err) {
                console.error("Error parsing mapping JSON", err);
            }
        }
    };

    // ... existing functions ...

    const fetchColumns = async () => {
        try {
            const res = await api.get(`/explorer/${connectionId}/columns/${tableName}`);
            setDbColumns(res.data);
        } catch (err) { console.error(err); }
    };

    const handleFileUpload = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post(`/import/${connectionId}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setPreview({ headers: res.data.headers, rows: res.data.preview });
            setFileId(res.data.fileId);

            if (res.data.sheets && res.data.sheets.length > 0) {
                setSheets(res.data.sheets);
                setSelectedSheet(res.data.currentSheet || res.data.sheets[0]);
            } else {
                setSheets([]);
                setSelectedSheet('');
            }

            const initialMappings = {};
            res.data.headers.forEach(h => initialMappings[h] = '');
            setMappings(initialMappings);
            setStep(2);
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSheetChange = async (e) => {
        const newSheet = e.target.value;
        setSelectedSheet(newSheet);
        setLoading(true);
        try {
            const res = await api.post(`/import/${connectionId}/sheet-preview`, {
                fileId,
                sheetName: newSheet
            });
            setPreview({ headers: res.data.headers, rows: res.data.preview });

            // Reset mappings for new sheet
            const initialMappings = {};
            res.data.headers.forEach(h => initialMappings[h] = '');
            setMappings(initialMappings);
        } catch (err) {
            alert('Failed to load sheet: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        const activeMappings = {};
        Object.keys(mappings).forEach(key => {
            if (mappings[key]) activeMappings[key] = mappings[key];
        });

        if (Object.keys(activeMappings).length === 0) return alert('Map at least one column');

        setLoading(true);
        try {
            const res = await api.post(`/import/${connectionId}/execute-import`, {
                table: tableName,
                mappings: activeMappings,
                data: preview.rows,
                fileId: fileId,
                sheetName: selectedSheet
            });
            setImportResult(res.data);
            setStep(3);
            if (onSuccess) onSuccess();
        } catch (err) {
            alert('Import failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const autoMap = () => {
        const newMappings = { ...mappings };
        const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

        Object.keys(newMappings).forEach(csvHeader => {
            // 1. Exact match (case insensitive)
            let match = dbColumns.find(c => c.toLowerCase() === csvHeader.toLowerCase());

            // 2. Normalized match (ignore special chars)
            if (!match) {
                const normCsv = normalize(csvHeader);
                match = dbColumns.find(c => normalize(c) === normCsv);
            }

            // 3. Levenshtein Fuzzy Match
            if (!match) {
                match = findBestMatch(csvHeader, dbColumns, 0.4);
            }

            if (match) newMappings[csvHeader] = match;
        });
        setMappings(newMappings);
    };

    const removeColumn = (csvHeader) => {
        const newMappings = { ...mappings };
        delete newMappings[csvHeader];
        setMappings(newMappings);
    };

    useEffect(() => {
        if (isOpen && connectionId && tableName) {
            fetchColumns();
            fetchSavedMappings();
            setStep(1);
            setFile(null);
            setPreview({ headers: [], rows: [] });
            setMappings({});
            setImportResult(null);
            setSheets([]);
            setSelectedSheet('');
            setFileId(null);
            setShowSaveModal(false);
            setTemplateName('');
        }
    }, [isOpen, connectionId, tableName]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative', background: 'var(--bg-secondary)' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Import Data to {tableName}</h2>

                {/* Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: step >= 1 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                    }}>1</div>
                    <div style={{ height: '2px', width: '50px', background: step >= 2 ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }} />
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: step >= 2 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                    }}>2</div>
                    <div style={{ height: '2px', width: '50px', background: step >= 3 ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }} />
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: step >= 3 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                    }}>3</div>
                </div>

                {step === 1 && (
                    <div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>CSV or XLSX File</label>
                            <div style={{
                                border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '2rem',
                                textAlign: 'center', cursor: 'pointer', background: 'var(--bg-primary)'
                            }}>
                                <input
                                    type="file"
                                    accept=".csv, .xlsx"
                                    onChange={e => setFile(e.target.files[0])}
                                    style={{ display: 'none' }}
                                    id="modal-file-upload"
                                />
                                <label htmlFor="modal-file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <Upload size={32} color="var(--text-secondary)" />
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {file ? file.name : 'Click to upload file'}
                                    </span>
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={handleFileUpload} disabled={loading || !file}>
                                {loading ? 'Uploading...' : 'Next: Map Columns'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {sheets.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ fontWeight: '600' }}>Sheet:</label>
                                        <select
                                            className="input"
                                            value={selectedSheet}
                                            onChange={handleSheetChange}
                                            style={{ minWidth: '120px' }}
                                        >
                                            {sheets.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: '600' }}>Template:</label>
                                    <select className="input" onChange={handleLoadMapping} style={{ minWidth: '120px' }}>
                                        <option value="">Load...</option>
                                        {savedMappings.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <button className="btn btn-secondary" onClick={handleSaveMapping} style={{ padding: '0.5rem' }} title="Save current mapping">
                                        Save
                                    </button>
                                </div>
                            </div>
                            <button className="btn btn-secondary" onClick={autoMap}>
                                Smart Auto Map
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 40px', gap: '1rem', marginBottom: '2rem', maxHeight: '400px', overflowY: 'auto' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Source Column</div>
                            <div style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Target Column</div>
                            <div style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Preview</div>
                            <div style={{ fontWeight: '600', color: 'var(--text-secondary)' }}></div>

                            {Object.keys(mappings).map(csvHeader => (
                                <React.Fragment key={csvHeader}>
                                    <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center' }}>
                                        {csvHeader}
                                    </div>
                                    <div>
                                        <select
                                            className="input"
                                            value={mappings[csvHeader]}
                                            onChange={e => setMappings({ ...mappings, [csvHeader]: e.target.value })}
                                            style={{ padding: '0.5rem' }}
                                        >
                                            <option value="">-- Skip --</option>
                                            {dbColumns.map(col => <option key={col} value={col}>{col}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontStyle: 'italic', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {preview.rows[0] ? String(preview.rows[0][csvHeader]) : ''}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => removeColumn(csvHeader)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.5rem' }}
                                            title="Remove Column"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
                                {loading ? 'Importing...' : 'Run Import'}
                            </button>
                        </div>
                    </div>
                )}
                {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '50%', background: 'var(--success)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto'
                        }}>
                            <Check color="white" size={32} />
                        </div>
                        <h2 style={{ marginTop: 0 }}>Import Complete</h2>
                        <p>Successfully imported {importResult?.successCount} rows.</p>
                        {importResult?.errorCount > 0 && (
                            <p style={{ color: 'var(--danger)' }}>Failed to import {importResult.errorCount} rows.</p>
                        )}
                        <button className="btn btn-primary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                )}
            </div>
            {showSaveModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: 'var(--bg-secondary)' }}>
                        <h3 style={{ marginTop: 0 }}>Save Mapping Template</h3>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Template Name</label>
                            <input
                                type="text"
                                className="input"
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)}
                                placeholder="e.g., Monthly Sales Import"
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={confirmSaveMapping}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportModal;
