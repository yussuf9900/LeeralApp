
import { 
  LayoutDashboard, 
  Calculator, 
  Gauge, 
  History, 
  User,
  Settings,
  Users
} from 'lucide-react';

type TabType = 'dashboard' | 'simulator' | 'meters' | 'history' | 'profile' | 'tarifs' | 'utilisateurs' | 'audit';

interface BottomNavProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  userProfile: any;
}

export default function BottomNav({ currentTab, setCurrentTab, userProfile }: BottomNavProps) {
  const isAdmin = userProfile?.role === 'ADMIN';

  const navItems = isAdmin ? [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history' as TabType, label: 'Factures', icon: History },
    { id: 'tarifs' as TabType, label: 'Tarifs', icon: Settings },
    { id: 'utilisateurs' as TabType, label: 'Users', icon: Users },
    { id: 'profile' as TabType, label: 'Profil', icon: User }
  ] : [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'simulator' as TabType, label: 'Simuler', icon: Calculator },
    { id: 'meters' as TabType, label: 'Compteurs', icon: Gauge },
    { id: 'history' as TabType, label: 'Historique', icon: History },
    { id: 'profile' as TabType, label: 'Profil', icon: User }
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button 
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setCurrentTab(item.id)}
          >
            <Icon size={20} />
            <span style={{ fontSize: 10 }}>{item.label}</span>
            {isActive && <div className="nav-active-dot" />}
          </button>
        );
      })}
    </nav>
  );
}
