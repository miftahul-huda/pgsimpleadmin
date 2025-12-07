import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Database, Terminal, Upload, Settings, LogOut, LayoutDashboard } from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/connections', icon: Settings, label: 'Connections' },
        { path: '/explorer', icon: Database, label: 'Explorer' },
        { path: '/query', icon: Terminal, label: 'Query Tool' },
        { path: '/import', icon: Upload, label: 'Import Data' },
    ];

    return (
        <div style={{
            width: '260px',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '40px', height: '40px',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Database color="white" size={24} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>PGSimple</h2>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius)',
                                color: isActive ? 'white' : 'var(--text-secondary)',
                                background: isActive ? 'var(--accent-primary)' : 'transparent',
                                transition: 'all 0.2s',
                                fontWeight: isActive ? '600' : '400'
                            }}
                        >
                            <Icon size={20} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <button
                onClick={handleLogout}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius)',
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: 'none',
                    marginTop: 'auto',
                    cursor: 'pointer'
                }}
            >
                <LogOut size={20} />
                Logout
            </button>
        </div>
    );
};

export default Sidebar;
