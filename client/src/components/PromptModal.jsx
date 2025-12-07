import React from 'react';

const PromptModal = ({ isOpen, title, message, defaultValue = '', onConfirm, onCancel }) => {
    const [value, setValue] = React.useState(defaultValue);

    React.useEffect(() => {
        if (isOpen) setValue(defaultValue);
    }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="glass-panel" style={{ width: '400px', padding: '1.5rem', background: 'var(--bg-secondary)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{message}</p>
                <input
                    className="input"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onConfirm(value);
                        if (e.key === 'Escape') onCancel();
                    }}
                    autoFocus
                    style={{ marginBottom: '1rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => onConfirm(value)}>OK</button>
                </div>
            </div>
        </div>
    );
};

export default PromptModal;
