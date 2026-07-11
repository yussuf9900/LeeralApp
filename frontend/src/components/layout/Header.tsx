import { Zap, LogOut } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

interface HeaderProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  userProfile: any;
  onLogout: () => void;
}

export default function Header({
  theme,
  setTheme,
  userProfile,
  onLogout
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
        )}
      </div>
    </header>
  );
}
