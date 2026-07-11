import { 
  Zap, 
  LayoutDashboard, 
  Calculator, 
  Gauge, 
  History, 
  User, 
  LogOut,
  Settings,
  Users,
  ShieldCheck
} from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

type TabType = 'dashboard' | 'simulator' | 'meters' | 'history' | 'profile' | 'tarifs' | 'utilisateurs' | 'audit';

interface SidebarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  userProfile: any;
  onLogout: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  theme,
  setTheme,
  userProfile,
  onLogout
}: SidebarProps) {
  const isAdmin = userProfile?.role === 'ADMIN';

  const menuItems = isAdmin ? [
    { id: 'dashboard' as TabType, label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'history' as TabType, label: 'Toutes les Factures', icon: History },
    { id: 'tarifs' as TabType, label: 'Tarifs Réglementés', icon: Settings },
    { id: 'utilisateurs' as TabType, label: 'Gestion Utilisateurs', icon: Users },
    { id: 'audit' as TabType, label: 'Centre d\'Audit', icon: ShieldCheck },
    { id: 'profile' as TabType, label: 'Mon Profil', icon: User }
  ] : [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'simulator' as TabType, label: 'Simulateur', icon: Calculator },
    { id: 'meters' as TabType, label: 'Mes Compteurs', icon: Gauge },
    { id: 'history' as TabType, label: 'Historique', icon: History },
    { id: 'profile' as TabType, label: 'Profil & Budget', icon: User }
  ];

  return (
    <aside className="app-sidebar">
      {/* Sidebar Brand logo */}
      <div className="sidebar-brand">
        <Zap size={24} fill="#f59e0b" color="#f59e0b" style={{ filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.4))' }} />
        <h2>LEERAL</h2>
      </div>

      {/* Navigation menu */}
      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button 
              key={item.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentTab(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {isActive && <div className="sidebar-item-pill" />}
            </button>
          );
        })}
      </nav>

      {/* Footer / Profile section */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Thème</span>
          <ThemeToggle theme={theme} onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
        </div>

        {userProfile && (
          <div className="sidebar-user-card">
            <div 
              style={{ 
                width: 38, 
                height: 38, 
                borderRadius: '50%', 
                background: 'var(--color-primary-light)', 
                color: 'var(--color-primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 14,
                border: '1.5px solid var(--border-color)',
                flexShrink: 0
              }}
            >
              {userProfile.nom?.substring(0, 1).toUpperCase()}
            </div>
            
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 10 }}>
              <h4 style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userProfile.nom}
              </h4>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {userProfile.email}
              </span>
            </div>

            <button 
              onClick={onLogout}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                borderRadius: 8,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              title="Déconnexion"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
