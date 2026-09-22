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
  ShieldCheck,
  Scale
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
  onOpenLegalModal?: (tab: 'mentions' | 'confidentialite' | 'cgu' | 'cookies') => void;
  unreadNotifCount?: number;
  onToggleNotifications?: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  theme,
  setTheme,
  userProfile,
  onLogout,
  onOpenLegalModal,
  unreadNotifCount,
  onToggleNotifications
}: SidebarProps) {
  const isAdmin = userProfile?.role === 'ADMIN';

  const menuItems = isAdmin ? [
    { id: 'dashboard' as TabType, label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'history' as TabType, label: 'Toutes les Factures', icon: History },
    { id: 'tarifs' as TabType, label: 'Tarifs Réglementés', icon: Settings },
    { id: 'utilisateurs' as TabType, label: 'Gestion Utilisateurs', icon: Users },
    { id: 'audit' as TabType, label: 'Centre d\'Audit', icon: ShieldCheck }
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
        {/* Liens Juridiques Sénégal (CDP & CRSE) */}
        <div style={{
          padding: '10px 12px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          marginBottom: 16
        }}>
          <button
            type="button"
            onClick={() => onOpenLegalModal?.('confidentialite')}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 0,
              marginBottom: 6,
              textAlign: 'left'
            }}
          >
            <Scale size={13} color="#f59e0b" />
            <span>Cadre Légal & CDP Sénégal</span>
          </button>
          <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-muted)' }}>
            <button
              type="button"
              onClick={() => onOpenLegalModal?.('mentions')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer', padding: 0 }}
            >
              Mentions
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenLegalModal?.('cgu')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer', padding: 0 }}
            >
              CGU
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenLegalModal?.('cookies')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer', padding: 0 }}
            >
              Cookies
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Alertes & Notifs</span>
          <button
            onClick={onToggleNotifications}
            title="Centre d'alertes Leeral"
            style={{
              position: 'relative',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border-color)',
              borderRadius: '50%',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: (unreadNotifCount || 0) > 0 ? 'var(--color-primary)' : 'var(--text-secondary)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Zap size={16} fill={(unreadNotifCount || 0) > 0 ? '#f59e0b' : 'none'} color="#f59e0b" />
            {(unreadNotifCount || 0) > 0 && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: '#ef4444',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 900,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                border: '2px solid var(--bg-card)'
              }}>
                {(unreadNotifCount || 0) > 99 ? '99+' : unreadNotifCount}
              </span>
            )}
          </button>
        </div>

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
