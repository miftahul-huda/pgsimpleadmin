import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onClose }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '50px', height: '50px', borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <AlertTriangle size={32} />
                    </div>
                    <h3 style={{ margin: 0 }}>{title || 'Confirm'}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{message}</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', width: '100%' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={onClose}
                            style={{ flex: 1, justifyContent: 'center' }}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => { onConfirm(); onClose(); }}
                            style={{ flex: 1, justifyContent: 'center', background: 'var(--danger)', borderColor: 'var(--danger)' }}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
