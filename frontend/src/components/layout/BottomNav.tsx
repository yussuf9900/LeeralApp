
import { 
  LayoutDashboard, 
  Calculator, 
  Gauge, 
  History, 
  User 
} from 'lucide-react';

type TabType = 'dashboard' | 'simulator' | 'meters' | 'history' | 'profile';

interface BottomNavProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
}

export default function BottomNav({ currentTab, setCurrentTab }: BottomNavProps) {
  const navItems = [
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
            <span>{item.label}</span>
            {isActive && <div className="nav-active-dot" />}
          </button>
        );
      })}
    </nav>
  );
}
