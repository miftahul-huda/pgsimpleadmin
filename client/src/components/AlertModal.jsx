import React from 'react';
import { AlertCircle } from 'lucide-react';

const AlertModal = ({ isOpen, title, message, onClose }) => {
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
                        background: 'rgba(255, 159, 67, 0.2)', color: 'var(--warning)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <AlertCircle size={32} />
                    </div>
                    <h3 style={{ margin: 0 }}>{title || 'Alert'}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{message}</p>
                    <button
                        className="btn btn-primary"
                        onClick={onClose}
                        style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
