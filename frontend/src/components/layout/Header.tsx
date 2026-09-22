import { Zap, LogOut, Bell } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

interface HeaderProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  userProfile: any;
  onLogout: () => void;
  unreadNotifCount?: number;
  onToggleNotifications?: () => void;
}

export default function Header({
  theme,
  setTheme,
  userProfile,
  onLogout,
  unreadNotifCount = 0,
  onToggleNotifications
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <Zap size={24} fill="#f59e0b" color="#f59e0b" style={{ filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.4))' }} />
        <h1>LEERAL</h1>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <ThemeToggle theme={theme} onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} />

        {userProfile && (
          <>
            {/* Cloche de notifications interactive */}
            <button
              onClick={onToggleNotifications}
              title="Centre d'alertes & notifications"
              style={{
                position: 'relative',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: unreadNotifCount > 0 ? 'var(--color-primary)' : 'var(--text-secondary)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Bell size={18} />
              {unreadNotifCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 900,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    border: '2px solid var(--bg-card)',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)'
                  }}
                >
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div 
                style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: '50%', 
                  background: 'var(--color-primary-light)', 
                  color: 'var(--color-primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                  border: '1.5px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
                }}
                title={userProfile.nom}
              >
                {userProfile.nom?.substring(0, 1).toUpperCase()}
              </div>
              <button 
                onClick={onLogout}
                style={{
                  cursor: 'pointer',
                  color: 'var(--color-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 6,
                  borderRadius: '50%',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  background: 'var(--bg-card)'
                }}
                title="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
