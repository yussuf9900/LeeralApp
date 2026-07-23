import './App.css';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  AlertTriangle, 
  Zap, 
  Droplet, 
  DollarSign, 
  MapPin, 
  LogOut,
  Users,
  FileText,
  Activity
} from 'lucide-react';

// Layout & UI Components
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Sidebar from './components/layout/Sidebar';
import Onboarding from './components/auth/Onboarding';
import AuthCard from './components/auth/AuthCard';
import GlassCard from './components/ui/GlassCard';
import SegmentedControl from './components/ui/SegmentedControl';

// Page-Specific Components
import BudgetGlowCard from './components/dashboard/BudgetGlowCard';
import ServiceCard from './components/dashboard/ServiceCard';
import SavingsTip from './components/dashboard/SavingsTip';
import IndexInputCard from './components/simulator/IndexInputCard';
import BatteryGauge from './components/simulator/BatteryGauge';
import WaterBeaker from './components/simulator/WaterBeaker';
import CostDetails from './components/simulator/CostDetails';
import MeterCard from './components/meters/MeterCard';
import MeterForm from './components/meters/MeterForm';
import TransactionList from './components/history/TransactionList';
import RecommendationsWidget from './components/dashboard/RecommendationsWidget';
import WoyofalRechargeCard from './components/simulator/WoyofalRechargeCard';

type TabType = 'dashboard' | 'simulator' | 'meters' | 'history' | 'profile' | 'tarifs' | 'utilisateurs' | 'audit';

// Global API Helper
const apiRequest = async (url: string, method = 'GET', body: any = null, token: string | null = null) => {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const config: any = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }
  const response = await fetch(url, config);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Une erreur est survenue.');
  }
  return data;
};

export default function App() {
  // Theme & Auth state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [token, setToken] = useState<string | null>(localStorage.getItem('leeral_token'));
  const [showIntro, setShowIntro] = useState<boolean>(!localStorage.getItem('leeral_token'));
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  // Auth form error state
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // App Data State
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [meters, setMeters] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Admin Data State
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminTarifs, setAdminTarifs] = useState<any[]>([]);
  const [adminAuditReport, setAdminAuditReport] = useState<any>(null);
  const [adminConfigs, setAdminConfigs] = useState<any[]>([]);

  // Simulator State
  const [simService, setSimService] = useState<'SENELEC' | 'SENEAU'>('SENELEC');
  const [simSenelecMode, setSimSenelecMode] = useState<'WOYOFAL' | 'POSTPAID'>('WOYOFAL');
  const [simAncienIndex, setSimAncienIndex] = useState<number>(0);
  const [simNouvelIndex, setSimNouvelIndex] = useState<number>(10);
  const [simModePaiement, setSimModePaiement] = useState<'CASH' | 'DIGITAL'>('DIGITAL');
  const [simVilleType, setSimVilleType] = useState<'ASSAINIE' | 'NON_ASSAINIE'>('NON_ASSAINIE');
  const [simResult, setSimResult] = useState<any>(null);
  const [simSaving, setSimSaving] = useState(false);
  const [simSuccessMsg, setSimSuccessMsg] = useState('');

  // Meters Management Feedback
  const [meterMsg, setMeterMsg] = useState('');

  // Profile Settings State
  const [profileBudget, setProfileBudget] = useState<number>(0);
  const [profileVilleType, setProfileVilleType] = useState<'ASSAINIE' | 'NON_ASSAINIE'>('NON_ASSAINIE');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load user profile & data when authenticated
  useEffect(() => {
    if (token) {
      setShowIntro(false);
      loadUserData();
    } else {
      setUserProfile(null);
    }
  }, [token]);

  const loadUserData = async () => {
    try {
      // 1. Fetch Profile
      const profile = await apiRequest('/api/v1/auth/profile', 'GET', null, token);
      setUserProfile(profile);
      setProfileBudget(parseFloat(profile.budget_mensuel || 0));
      setProfileVilleType(profile.ville_type || 'NON_ASSAINIE');
      setSimVilleType(profile.ville_type || 'NON_ASSAINIE');

      // 2. Fetch Dashboard Statistics
      const stats = await apiRequest('/api/v1/dashboard/stats', 'GET', null, token);
      setDashboardStats(stats);

      // 3. Fetch Meters
      const meterList = await apiRequest('/api/v1/compteurs', 'GET', null, token);
      setMeters(meterList);

      // 4. Fetch History
      const hist = await apiRequest('/api/v1/facturation/history', 'GET', null, token);
      setHistory(hist);

      // 5. Fetch Recommendations
      try {
        const recs = await apiRequest('/api/v1/facturation/recommandations', 'GET', null, token);
        setRecommendations(recs);
      } catch (e) {
        console.warn('Recommandations non disponibles', e);
      }

      // 5. Fetch Admin data if admin role
      if (profile.role === 'ADMIN') {
        const usersList = await apiRequest('/api/v1/admin/utilisateurs', 'GET', null, token);
        setAdminUsers(usersList);

        const tarifsList = await apiRequest('/api/v1/admin/tarifs', 'GET', null, token);
        setAdminTarifs(tarifsList);

        const audit = await apiRequest('/api/v1/admin/audit/rapport-annuel', 'GET', null, token);
        setAdminAuditReport(audit);

        const configsList = await apiRequest('/api/v1/admin/configurations', 'GET', null, token);
        setAdminConfigs(configsList);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('token') || err.message.includes('invalide')) {
        handleLogout();
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('leeral_token');
    setToken(null);
    setUserProfile(null);
    setShowIntro(true);
    setCurrentTab('dashboard');
  };

  const handleAuthSubmit = async (data: any) => {
    setAuthLoading(true);
    try {
      if (data.isLogin) {
        const res = await apiRequest('/api/v1/auth/login', 'POST', {
          email: data.email,
          mot_de_passe: data.password
        });
        localStorage.setItem('leeral_token', res.token);
        setToken(res.token);
      } else {
        const res = await apiRequest('/api/v1/auth/register', 'POST', {
          nom: data.name,
          email: data.email,
          mot_de_passe: data.password,
          ville_type: data.villeType,
          is_subvented: data.isSubvented
        });
        localStorage.setItem('leeral_token', res.token);
        setToken(res.token);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentification échouée.');
    } finally {
      setAuthLoading(false);
    }
  };

  // --- Woyofal Top-up handlers ---
  const handleWoyofalCalculate = async (data: { montant: number; modePaiement: 'CASH' | 'DIGITAL'; consoJournaliere: number; dateAchat?: string }) => {
    setSimResult(null);
    setSimSuccessMsg('');
    try {
      const res = await apiRequest('/api/v1/facturation/senelec', 'POST', {
        montant: data.montant,
        mode_paiement: data.modePaiement,
        conso_journaliere: data.consoJournaliere,
        date_achat: data.dateAchat,
        mode_facturation: 'WOYOFAL',
        type_calcul: 'PAR_MONTANT',
        save_to_history: false
      }, token);
      setSimResult(res.details);
      if (res.recommandations) {
        setRecommendations(res.recommandations);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleWoyofalSave = async (montant: number, modePaiement: 'CASH' | 'DIGITAL', consoJournaliere: number, dateAchat?: string) => {
    if (!simResult) return;
    setSimSaving(true);
    setSimSuccessMsg('');
    try {
      const idKey = `IDEM-WOY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await apiRequest('/api/v1/facturation/senelec', 'POST', {
        montant,
        mode_paiement: modePaiement,
        conso_journaliere: consoJournaliere,
        date_achat: dateAchat,
        mode_facturation: 'WOYOFAL',
        type_calcul: 'PAR_MONTANT',
        type_transaction: 'RECHARGE_WOYOFAL',
        save_to_history: true,
        idempotency_key: idKey
      }, token);

      setSimSuccessMsg('Recharge Woyofal enregistrée avec succès dans votre budget !');
      if (res.recommandations) {
        setRecommendations(res.recommandations);
      }
      loadUserData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSimSaving(false);
    }
  };

  // --- Calculations handler ---
  const handleCalculate = async () => {
    setSimResult(null);
    setSimSuccessMsg('');
    try {
      if (simNouvelIndex < simAncienIndex) {
        throw new Error("Le nouvel index doit être supérieur ou égal à l'ancien index.");
      }

      let res;
      if (simService === 'SENELEC') {
        res = await apiRequest('/api/v1/facturation/senelec', 'POST', {
          ancien_index: simAncienIndex,
          nouvel_index: simNouvelIndex,
          mode_paiement: simModePaiement,
          save_to_history: false
        }, token);
      } else {
        res = await apiRequest('/api/v1/facturation/seneau', 'POST', {
          ancien_index: simAncienIndex,
          nouvel_index: simNouvelIndex,
          mode_paiement: simModePaiement,
          ville_type: simVilleType,
          save_to_history: false
        }, token);
      }
      setSimResult(res.details);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- Save invoice/simulation to database ---
  const handleSaveCalculation = async () => {
    if (!simResult) return;
    setSimSaving(true);
    setSimSuccessMsg('');
    try {
      const typeTx = simService === 'SENELEC' ? 'RECHARGE_WOYOFAL' : 'FACTURE_EAU';
      const idKey = `IDEM-WOY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      if (simService === 'SENELEC') {
        await apiRequest('/api/v1/facturation/senelec', 'POST', {
          ancien_index: simAncienIndex,
          nouvel_index: simNouvelIndex,
          mode_paiement: simModePaiement,
          type_transaction: typeTx,
          save_to_history: true,
          idempotency_key: idKey
        }, token);
      } else {
        await apiRequest('/api/v1/facturation/seneau', 'POST', {
          ancien_index: simAncienIndex,
          nouvel_index: simNouvelIndex,
          mode_paiement: simModePaiement,
          ville_type: simVilleType,
          type_transaction: typeTx,
          save_to_history: true,
          idempotency_key: idKey
        }, token);
      }

      setSimSuccessMsg('Enregistré avec succès dans votre budget !');
      loadUserData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSimSaving(false);
    }
  };

  // --- Admin action handlers ---
  const handleUpdateTariff = async (tariffId: number, val: number) => {
    try {
      await apiRequest(`/api/v1/admin/tarifs/${tariffId}`, 'PUT', { prix_par_unite: val }, token);
      loadUserData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateConfig = async (cle: string, val: number) => {
    try {
      await apiRequest(`/api/v1/admin/configurations/${cle}`, 'PUT', { valeur: val }, token);
      // Reload configurations
      const configsList = await apiRequest('/api/v1/admin/configurations', 'GET', null, token);
      setAdminConfigs(configsList);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateUser = async (userId: string, role: string, isSubvented: boolean, villeType: string) => {
    try {
      await apiRequest(`/api/v1/admin/utilisateurs/${userId}`, 'PUT', {
        role,
        is_subvented: isSubvented,
        ville_type: villeType
      }, token);
      loadUserData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
    try {
      await apiRequest(`/api/v1/admin/utilisateurs/${userId}`, 'DELETE', null, token);
      loadUserData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- Meter Management handlers ---
  const handleAddMeterSubmit = async (data: any) => {
    setMeterMsg('');
    try {
      await apiRequest('/api/v1/compteurs', 'POST', data, token);
      setMeterMsg('Compteur ajouté avec succès !');
      loadUserData();
    } catch (err: any) {
      setMeterMsg(err.message);
    }
  };

  const handleDeleteMeter = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce compteur ?')) return;
    try {
      await apiRequest(`/api/v1/compteurs/${id}`, 'DELETE', null, token);
      loadUserData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- Profile / Budget limit updates ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    try {
      await apiRequest('/api/v1/dashboard/budget', 'PUT', { budget_mensuel: profileBudget }, token);
      await apiRequest(`/api/v1/admin/utilisateurs/${userProfile.id}`, 'PUT', {
        ville_type: profileVilleType
      }, token);

      setProfileSuccessMsg('Profil et budget mis à jour !');
      loadUserData();
    } catch (err: any) {
      setProfileSuccessMsg(err.message);
    }
  };

  const handlePayBill = async (id: string) => {
    try {
      await apiRequest(`/api/v1/facturation/pay/${id}`, 'PUT', null, token);
      loadUserData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startSimulationFromMeter = (meter: any) => {
    setSimService(meter.service);
    setSimAncienIndex(parseFloat(meter.dernier_index));
    setSimNouvelIndex(parseFloat(meter.dernier_index) + 10);
    setSimResult(null);
    setCurrentTab('simulator');
  };

  if (!token) {
    if (showIntro) {
      return <Onboarding onStart={() => setShowIntro(false)} />;
    }
    return (
      <AuthCard 
        onBack={() => setShowIntro(true)}
        onSubmit={handleAuthSubmit}
        loading={authLoading}
        error={authError}
        setError={setAuthError}
      />
    );
  }

  // Render Charts Data (Senelec vs Seneau spendings)
  const chartData = dashboardStats && userProfile?.role !== 'ADMIN' ? [
    { name: 'Électricité', Montant: dashboardStats.depenses_senelec, color: '#f59e0b' },
    { name: 'Eau', Montant: dashboardStats.depenses_seneau, color: '#0ea5e9' }
  ] : [];

  const adminChartData = dashboardStats && userProfile?.role === 'ADMIN' ? [
    { name: 'Simulations Élec', Volume: dashboardStats.simulations_senelec || 0, color: '#f59e0b' },
    { name: 'Simulations Eau', Volume: dashboardStats.simulations_seneau || 0, color: '#0ea5e9' }
  ] : [];

  const getConsumptionChartData = () => {
    const monthlyData: { [key: string]: { month: string; Senelec: number; Seneau: number } } = {};
    const sortedHistory = [...history].sort((a, b) => new Date(a.cree_a).getTime() - new Date(b.cree_a).getTime());

    sortedHistory.forEach(item => {
      const date = new Date(item.cree_a);
      const monthKey = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const val = parseFloat(item.consommation || '0');

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, Senelec: 0, Seneau: 0 };
      }

      if (item.service === 'SENELEC') {
        monthlyData[monthKey].Senelec += val;
      } else if (item.service === 'SENEAU') {
        monthlyData[monthKey].Seneau += val;
      }
    });

    return Object.values(monthlyData);
  };

  const tabTransition = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  } as const;

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <Sidebar 
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        theme={theme}
        setTheme={setTheme}
        userProfile={userProfile}
        onLogout={handleLogout}
      />

      {/* HEADER (Mobile Only) */}
      <Header 
        theme={theme} 
        setTheme={setTheme} 
        userProfile={userProfile} 
        onLogout={handleLogout} 
      />

      {/* BODY CONTENT */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          {/* TAB 1: DASHBOARD (Client) */}
          {currentTab === 'dashboard' && userProfile?.role !== 'ADMIN' && (
            <motion.div key="dashboard" className="dashboard-grid" {...tabTransition}>
              {/* Left Column */}
              <div className="dashboard-left-col">
                {/* Alert Overrun Banner */}
                {dashboardStats?.budget_alerte && (
                  <div className="alert-banner">
                    <AlertTriangle size={20} />
                    <span>{dashboardStats.alerte_message}</span>
                  </div>
                )}

                {/* Monthly Budget Jauge Card */}
                <BudgetGlowCard stats={dashboardStats} />

                {/* Service Consumptions */}
                <div className="service-cards-grid">
                  <ServiceCard 
                    service="SENELEC"
                    value={dashboardStats?.consommation_senelec_kwh || 0}
                    cost={dashboardStats?.depenses_senelec || 0}
                  />
                  <ServiceCard 
                    service="SENEAU"
                    value={dashboardStats?.consommation_seneau_m3 || 0}
                    cost={dashboardStats?.depenses_seneau || 0}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="dashboard-right-col">
                {/* Spending Breakdown Chart */}
                {dashboardStats && dashboardStats.total_depenses > 0 && (
                  <GlassCard style={{ padding: 20, marginBottom: 20 }} hoverScale={false}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Répartition par service</h4>
                    <div style={{ width: '100%', height: 160 }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={80} style={{ fontSize: 12, fill: 'var(--text-secondary)', fontWeight: 700 }} />
                          <Tooltip formatter={(value) => [`${value} FCFA`, 'Dépense']} contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: 12 }} />
                          <Bar dataKey="Montant" radius={8} barSize={20}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                )}

                {/* Quick Meters list in dashboard */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800 }}>Mes Compteurs</h4>
                  <button 
                    onClick={() => setCurrentTab('meters')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    Gérer
                  </button>
                </div>

                <div className="meters-horizontal">
                  {meters.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, padding: 8, fontWeight: 500 }}>
                      Aucun compteur enregistré.
                    </div>
                  ) : (
                    meters.map(m => (
                      <div key={m.id} className="meter-pill" onClick={() => startSimulationFromMeter(m)}>
                        {m.service === 'SENELEC' ? (
                          <Zap size={14} color="#f59e0b" fill="#f59e0b" />
                        ) : (
                          <Droplet size={14} color="#0ea5e9" fill="#0ea5e9" />
                        )}
                        <span>{m.nom}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Smart Savings Tip */}
                <SavingsTip stats={dashboardStats} />

                {/* Recommendations & Advice Widget */}
                <RecommendationsWidget recommendations={recommendations} />
              </div>
            </motion.div>
          )}

          {/* TAB 1: DASHBOARD (Admin) */}
          {currentTab === 'dashboard' && userProfile?.role === 'ADMIN' && (
            <motion.div key="admin-dashboard" className="dashboard-grid" {...tabTransition}>
              {/* Stats Cards */}
              <div className="service-cards-grid" style={{ gridColumn: '1 / -1', marginBottom: 20 }}>
                <GlassCard style={{ padding: 18, borderLeft: '4px solid var(--color-success)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>Recettes Totales (TTC)</div>
                      <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>
                        {(dashboardStats?.total_revenus || 0).toLocaleString('fr-FR')} F
                      </h2>
                    </div>
                    <div style={{ padding: 10, borderRadius: 12, background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success)' }}>
                      <DollarSign size={24} />
                    </div>
                  </div>
                </GlassCard>

                <GlassCard style={{ padding: 18, borderLeft: '4px solid var(--color-warning)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>En-cours (Non Payés)</div>
                      <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 8, color: 'var(--color-warning)' }}>
                        {(dashboardStats?.total_encours || 0).toLocaleString('fr-FR')} F
                      </h2>
                    </div>
                    <div style={{ padding: 10, borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
                      <Activity size={24} />
                    </div>
                  </div>
                </GlassCard>

                <GlassCard style={{ padding: 18, borderLeft: '4px solid var(--color-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>Nombre d'Inscriptions</div>
                      <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>
                        {dashboardStats?.total_inscriptions || 0}
                      </h2>
                    </div>
                    <div style={{ padding: 10, borderRadius: 12, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      <Users size={24} />
                    </div>
                  </div>
                </GlassCard>

                <GlassCard style={{ padding: 18, borderLeft: '4px solid #0ea5e9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>Simulations Totales</div>
                      <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>
                        {(dashboardStats?.simulations_senelec || 0) + (dashboardStats?.simulations_seneau || 0)}
                      </h2>
                    </div>
                    <div style={{ padding: 10, borderRadius: 12, background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
                      <FileText size={24} />
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Analytics Section with Recharts Chart */}
              <div style={{ gridColumn: '1 / -1', marginBottom: 20 }}>
                <GlassCard style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Volume global des simulations (Électricité vs Eau)</h4>
                  <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                      <BarChart data={adminChartData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={120} style={{ fontSize: 12, fill: 'var(--text-secondary)', fontWeight: 700 }} />
                        <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: 12 }} />
                        <Bar dataKey="Volume" radius={8} barSize={24}>
                          {adminChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>

              {/* All System Invoices */}
              <div style={{ gridColumn: '1 / -1' }}>
                <GlassCard style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Toutes les Factures du Système</h4>
                  <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          <th style={{ padding: '10px 8px' }}>Client</th>
                          <th style={{ padding: '10px 8px' }}>Référence</th>
                          <th style={{ padding: '10px 8px' }}>Date</th>
                          <th style={{ padding: '10px 8px' }}>Service</th>
                          <th style={{ padding: '10px 8px' }}>Mode</th>
                          <th style={{ padding: '10px 8px' }}>Consommation</th>
                          <th style={{ padding: '10px 8px' }}>Montant TTC</th>
                          <th style={{ padding: '10px 8px' }}>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Aucune facture enregistrée dans le système.</td>
                          </tr>
                        ) : (
                          history.map(inv => (
                            <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 600 }}>{inv.client_name || 'Utilisateur'}</td>
                              <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{inv.reference_facture}</td>
                              <td style={{ padding: '10px 8px' }}>{new Date(inv.cree_a).toLocaleDateString('fr-FR')}</td>
                              <td style={{ padding: '10px 8px', fontWeight: 700 }}>
                                <span className={`service-badge ${inv.service === 'SENELEC' ? 'senelec' : 'seneau'}`}>
                                  {inv.service}
                                </span>
                              </td>
                              <td style={{ padding: '10px 8px' }}>{inv.mode_paiement}</td>
                              <td style={{ padding: '10px 8px' }}>{parseFloat(inv.consommation).toLocaleString('fr-FR')} {inv.service === 'SENELEC' ? 'kWh' : 'm³'}</td>
                              <td style={{ padding: '10px 8px', fontWeight: 700 }}>{parseFloat(inv.montant_ttc).toLocaleString('fr-FR')} F</td>
                              <td style={{ padding: '10px 8px' }}>
                                <span className={`status-badge ${inv.statut === 'PAYE' ? 'paye' : 'non_paye'}`}>
                                  {inv.statut === 'PAYE' ? 'PAYÉ' : 'NON PAYÉ'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}

          {/* TAB 2: SIMULATOR */}
          {currentTab === 'simulator' && userProfile?.role !== 'ADMIN' && (
            <motion.div key="simulator" className="simulator-grid" {...tabTransition}>
              {/* Service & Mode Tabs */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 10 }}>
                <SegmentedControl 
                  selectedValue={simService}
                  onChange={(val) => {
                    setSimService(val);
                    setSimResult(null);
                  }}
                  activeColorClass={simService === 'SENELEC' ? 'senelec' : 'seneau'}
                  options={[
                    { value: 'SENELEC', label: 'SENELEC (Électricité)', icon: <Zap size={16} /> },
                    { value: 'SENEAU', label: "SEN'EAU (Eau)", icon: <Droplet size={16} /> }
                  ]}
                />

                {simService === 'SENELEC' && (
                  <SegmentedControl 
                    selectedValue={simSenelecMode}
                    onChange={(val) => {
                      setSimSenelecMode(val);
                      setSimResult(null);
                    }}
                    activeColorClass="senelec"
                    options={[
                      { value: 'WOYOFAL', label: '⚡ Woyofal (Prépaiement FCFA)', icon: <Zap size={14} /> },
                      { value: 'POSTPAID', label: '📄 Senelec Post-payé (Index)', icon: <FileText size={14} /> }
                    ]}
                  />
                )}
              </div>

              {simService === 'SENELEC' && simSenelecMode === 'WOYOFAL' ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <WoyofalRechargeCard 
                    onCalculate={(data) => handleWoyofalCalculate(data)}
                    onSaveRecharge={(data) => handleWoyofalSave(data.montant, data.modePaiement, data.consoJournaliere, data.dateAchat)}
                    result={simResult}
                    loading={simSaving}
                    successMsg={simSuccessMsg}
                  />
                </div>
              ) : (
                <>
                  {/* Left Column for Postpaid Senelec / Sen'Eau */}
                  <div className="simulator-left-col">
                    <div className="giant-index-grid">
                      <IndexInputCard 
                        label="Ancien Index"
                        value={simAncienIndex}
                        onChange={(val) => {
                          setSimAncienIndex(val);
                          setSimResult(null);
                        }}
                        service={simService}
                      />
                      <IndexInputCard 
                        label="Nouvel Index"
                        value={simNouvelIndex}
                        onChange={(val) => {
                          setSimNouvelIndex(val);
                          setSimResult(null);
                        }}
                        service={simService}
                      />
                    </div>

                    {/* Config Options */}
                    <GlassCard style={{ padding: 20, marginBottom: 20 }} hoverScale={false}>
                      <div className="form-group">
                        <label>Mode de paiement</label>
                        <div className="input-wrapper">
                          <select 
                            value={simModePaiement} 
                            onChange={(e) => {
                              setSimModePaiement(e.target.value as any);
                              setSimResult(null);
                            }}
                            style={{ paddingLeft: 16 }}
                          >
                            <option value="DIGITAL">Digital (Orange Money, Wave, etc.)</option>
                            <option value="CASH">Espèces (+1% droit de timbre)</option>
                          </select>
                        </div>
                      </div>

                      {simService === 'SENEAU' && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Zone d'assainissement</label>
                          <div className="input-wrapper">
                            <select 
                              value={simVilleType} 
                              onChange={(e) => {
                                setSimVilleType(e.target.value as any);
                                setSimResult(null);
                              }}
                              style={{ paddingLeft: 16 }}
                            >
                              <option value="NON_ASSAINIE">Non Assainie (Sans Égouts)</option>
                              <option value="ASSAINIE">Assainie (Avec Égouts)</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </GlassCard>

                    <button className="btn-premium btn-premium-primary" onClick={handleCalculate} style={{ marginBottom: 20 }}>
                      Calculer ma consommation
                    </button>
                  </div>

                  {/* Right Column for Postpaid Senelec / Sen'Eau */}
                  <div className="simulator-right-col">
                    {simResult ? (
                      simService === 'SENELEC' ? (
                        <BatteryGauge consumption={simResult.consommation} />
                      ) : (
                        <WaterBeaker consumption={simResult.consommation} />
                      )
                    ) : (
                      <GlassCard style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, padding: '24px 16px', fontWeight: 600 }} hoverScale={false}>
                        Ajustez les index à gauche pour lancer le calcul en temps réel
                      </GlassCard>
                    )}

                    {simResult && (
                      <CostDetails 
                        result={simResult}
                        service={simService}
                        onSave={handleSaveCalculation}
                        saving={simSaving}
                        successMsg={simSuccessMsg}
                        budgetOverrunWarning={
                          dashboardStats && dashboardStats.budget_mensuel > 0 && 
                          (parseFloat(dashboardStats.total_depenses || 0) + parseFloat(simResult.montant_ttc) > parseFloat(dashboardStats.budget_mensuel))
                            ? `Attention : Cet ajout dépassera votre budget mensuel de ${(parseFloat(dashboardStats.total_depenses || 0) + parseFloat(simResult.montant_ttc) - parseFloat(dashboardStats.budget_mensuel)).toLocaleString('fr-FR')} FCFA (Nouveau total projeté : ${(parseFloat(dashboardStats.total_depenses || 0) + parseFloat(simResult.montant_ttc)).toLocaleString('fr-FR')} / ${parseFloat(dashboardStats.budget_mensuel).toLocaleString('fr-FR')} FCFA).`
                            : undefined
                        }
                      />
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* TAB 3: METERS */}
          {currentTab === 'meters' && userProfile?.role !== 'ADMIN' && (
            <motion.div key="meters" className="meters-grid" {...tabTransition}>
              {/* Left Form Column */}
              <div className="meters-left-col">
                <MeterForm onSubmit={handleAddMeterSubmit} msg={meterMsg} />
              </div>

              {/* Right Cards List Column */}
              <div className="meters-right-col">
                <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>
                  Compteurs Enregistrés ({meters.length})
                </h4>
                
                <div className="meters-grid-list">
                  {meters.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 32, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
                      Aucun compteur enregistré. Utilisez le formulaire pour ajouter votre premier compteur.
                    </div>
                  ) : (
                    meters.map(m => (
                      <MeterCard 
                        key={m.id} 
                        meter={m} 
                        onSimulate={startSimulationFromMeter} 
                        onDelete={handleDeleteMeter} 
                      />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: HISTORY (Client) */}
          {currentTab === 'history' && userProfile?.role !== 'ADMIN' && (
            <motion.div key="history" className="history-grid" {...tabTransition}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Historique de Consommation & Budget</h3>

              {history.length > 0 && (
                <GlassCard style={{ padding: 20, marginBottom: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Évolution de la consommation au fil des mois</h4>
                  <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                      <LineChart data={getConsumptionChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="month" style={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                        <YAxis style={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                        <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="Senelec" name="Électricité (kWh)" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="Seneau" name="Eau (m³)" stroke="#0ea5e9" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              )}

              <TransactionList history={history} onPay={handlePayBill} />
            </motion.div>
          )}

          {/* TAB 4: HISTORY (Admin) */}
          {currentTab === 'history' && userProfile?.role === 'ADMIN' && (
            <motion.div key="admin-history-all" className="history-grid" {...tabTransition}>
              <GlassCard style={{ padding: 24 }} hoverScale={false}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Toutes les Factures du Système</h3>
                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                        <th style={{ padding: 10 }}>Client</th>
                        <th style={{ padding: 10 }}>Référence</th>
                        <th style={{ padding: 10 }}>Service</th>
                        <th style={{ padding: 10 }}>Volume</th>
                        <th style={{ padding: 10 }}>Mode</th>
                        <th style={{ padding: 10 }}>Montant TTC</th>
                        <th style={{ padding: 10 }}>Statut</th>
                        <th style={{ padding: 10 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: 10, fontWeight: 600 }}>{inv.client_name}</td>
                          <td style={{ padding: 10, fontFamily: 'monospace' }}>{inv.reference_facture}</td>
                          <td style={{ padding: 10, fontWeight: 700 }}>{inv.service}</td>
                          <td style={{ padding: 10 }}>{parseFloat(inv.consommation)} {inv.service === 'SENELEC' ? 'kWh' : 'm³'}</td>
                          <td style={{ padding: 10 }}>{inv.mode_paiement}</td>
                          <td style={{ padding: 10, fontWeight: 700 }}>{parseFloat(inv.montant_ttc).toLocaleString()} F</td>
                          <td style={{ padding: 10 }}>
                            <span className={`status-badge ${inv.statut === 'PAYE' ? 'paye' : 'non_paye'}`}>
                              {inv.statut === 'PAYE' ? 'Payé' : 'Impayé'}
                            </span>
                          </td>
                          <td style={{ padding: 10 }}>
                            {inv.service === 'SENEAU' && inv.statut !== 'PAYE' && (
                              <button 
                                onClick={() => handlePayBill(inv.id)}
                                style={{ border: 'none', background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 700, padding: '4px 8px', borderRadius: 8, cursor: 'pointer' }}
                              >
                                Enregistrer Paiement
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* TAB: TARIFS (Admin) */}
          {currentTab === 'tarifs' && userProfile?.role === 'ADMIN' && (
            <motion.div key="tarifs" className="history-grid" {...tabTransition}>
              <GlassCard style={{ padding: 24 }} hoverScale={false}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Grilles Tarifaires Réglementaires</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Ajustez les prix réglementés par unité (kWh ou m³). Toute modification crée une nouvelle version datée (effective_date) sans écraser l'historique.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {adminTarifs.map((tariff) => (
                    <GlassCard key={tariff.id} style={{ padding: 16, borderLeft: '4px solid var(--color-primary)' }} hoverScale={false}>
                      <h4 style={{ fontWeight: 800, fontSize: 14 }}>{tariff.service} - {tariff.type_tarif.replace('_', ' ')}</h4>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 4 }}>
                        Palier : de {parseFloat(tariff.palier_debut)} à {tariff.palier_fin !== null ? `${parseFloat(tariff.palier_fin)}` : '∞'} {tariff.service === 'SENELEC' ? 'kWh' : 'm³'}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 600, marginBottom: 12 }}>
                        Version Active : {new Date(tariff.effective_date).toLocaleDateString('fr-FR')}
                      </p>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11 }}>Prix unitaire (FCFA)</label>
                        <div className="input-wrapper">
                          <DollarSign size={16} />
                          <input 
                            type="number" 
                            step="0.01"
                            defaultValue={tariff.prix_par_unite}
                            onBlur={(e) => handleUpdateTariff(tariff.id, parseFloat(e.target.value))}
                            style={{ paddingLeft: 12 }}
                          />
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 32, marginBottom: 16 }}>Paramètres Globaux du Moteur de Calcul</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {adminConfigs.map((config) => {
                    const label = config.cle === 'senelec_seuil_tva' 
                      ? 'Seuil pivot de la TVA Senelec (kWh)' 
                      : 'Taux de réduction Tranche 1 Senelec (ex: 0.10 = -10%)';
                    return (
                      <GlassCard key={config.cle} style={{ padding: 16, borderLeft: '4px solid var(--color-warning)' }} hoverScale={false}>
                        <h4 style={{ fontWeight: 800, fontSize: 13 }}>{label}</h4>
                        <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 12 }}>
                          Clé : <code>{config.cle}</code> | Version : {new Date(config.effective_date).toLocaleDateString('fr-FR')}
                        </p>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <div className="input-wrapper">
                            <input 
                              type="number" 
                              step="0.01"
                              defaultValue={config.valeur}
                              onBlur={(e) => handleUpdateConfig(config.cle, parseFloat(e.target.value))}
                              style={{ paddingLeft: 12 }}
                            />
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* TAB: UTILISATEURS (Admin) */}
          {currentTab === 'utilisateurs' && userProfile?.role === 'ADMIN' && (
            <motion.div key="utilisateurs" className="history-grid" {...tabTransition}>
              <GlassCard style={{ padding: 24 }} hoverScale={false}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Gestion des Accès Clients</h3>
                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                        <th style={{ padding: 10 }}>Nom</th>
                        <th style={{ padding: 10 }}>Email</th>
                        <th style={{ padding: 10 }}>Rôle</th>
                        <th style={{ padding: 10 }}>Subventionné</th>
                        <th style={{ padding: 10 }}>Zone Assainie</th>
                        <th style={{ padding: 10 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: 10, fontWeight: 600 }}>{u.nom}</td>
                          <td style={{ padding: 10 }}>{u.email}</td>
                          <td style={{ padding: 10 }}>
                            <select 
                              defaultValue={u.role} 
                              onChange={(e) => handleUpdateUser(u.id, e.target.value, u.is_subvented, u.ville_type)}
                              style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                            >
                              <option value="CLIENT">CLIENT</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </td>
                          <td style={{ padding: 10, textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              defaultChecked={u.is_subvented}
                              onChange={(e) => handleUpdateUser(u.id, u.role, e.target.checked, u.ville_type)}
                            />
                          </td>
                          <td style={{ padding: 10 }}>
                            <select 
                              defaultValue={u.ville_type} 
                              onChange={(e) => handleUpdateUser(u.id, u.role, u.is_subvented, e.target.value)}
                              style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                            >
                              <option value="NON_ASSAINIE">Non Assainie</option>
                              <option value="ASSAINIE">Assainie</option>
                            </select>
                          </td>
                          <td style={{ padding: 10 }}>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={u.id === userProfile?.id}
                              style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', fontWeight: 700, cursor: u.id === userProfile?.id ? 'not-allowed' : 'pointer', opacity: u.id === userProfile?.id ? 0.5 : 1 }}
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* TAB: AUDIT (Admin) */}
          {currentTab === 'audit' && userProfile?.role === 'ADMIN' && adminAuditReport && (
            <motion.div key="audit" className="history-grid" {...tabTransition}>
              <GlassCard style={{ padding: 24 }} hoverScale={false}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Rapport d'Audit CRSE/SONES (OpenTelemetry)</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <GlassCard style={{ padding: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Validation TVA (Senelec &gt; 250kWh)</div>
                    <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--color-success)' }}>
                      {adminAuditReport.regulatory_compliance_checklist.senelec_tva_compliance}
                    </div>
                  </GlassCard>
                  <GlassCard style={{ padding: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Validation Droit de Timbre (1% CASH)</div>
                    <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--color-success)' }}>
                      {adminAuditReport.regulatory_compliance_checklist.droit_de_timbre_cash_compliance}
                    </div>
                  </GlassCard>
                  <GlassCard style={{ padding: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Empreinte d'Intégrité Audit</div>
                    <div style={{ marginTop: 8, fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>
                      {adminAuditReport.regulatory_compliance_checklist.integrity_hash.substring(0, 16)}...
                    </div>
                  </GlassCard>
                </div>

                <div style={{ padding: 16, background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 12, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
{`RAPPORT DE CONFORMITÉ FINANCIÈRE ET FISCALE LEERAL
-----------------------------------------------------------
Généré le : ${new Date(adminAuditReport.report_timestamp).toLocaleString('fr-FR')}
Régulation Cible : ${adminAuditReport.target_regulation}
Intégrité Cryptographique : SUCCESS

MÉTRIQUES DE CALCUL GLOBALES :
- Transactions traitées : ${adminAuditReport.metrics.total_transactions}
- Total Montant HT : ${adminAuditReport.metrics.total_ht.toLocaleString('fr-FR')} F CFA
- Total TVA collectée (18%) : ${adminAuditReport.metrics.total_tva.toLocaleString('fr-FR')} F CFA
- Total Droits de Timbre collectés (1% CASH) : ${adminAuditReport.metrics.total_timbre.toLocaleString('fr-FR')} F CFA
- Total Recettes TTC : ${adminAuditReport.metrics.total_ttc.toLocaleString('fr-FR')} F CFA

RECHARGE D'ÉNERGIE GLOBALE (SENELEC) :
- Consommation totale injectée : ${adminAuditReport.metrics.electricity_consumed_kwh.toLocaleString('fr-FR')} kWh

DISTRIBUTION D'EAU GLOBALE (SEN'EAU) :
- Consommation totale distribuée : ${adminAuditReport.metrics.water_consumed_m3.toLocaleString('fr-FR')} m³

RÉPARTITION PAR MODE DE PAIEMENT :
${adminAuditReport.payment_splits.map((s: any) => `- Mode [${s.mode}] : ${s.count} transactions, TTC: ${s.total_ttc.toLocaleString('fr-FR')} F, Timbre: ${s.total_timbre.toLocaleString('fr-FR')} F`).join('\n')}

VÉRIFICATIONS RÉGLEMENTAIRES EFFECTUÉES :
1. Application de la TVA Senelec sur tranche pivot (> 250 kWh uniquement) : ${adminAuditReport.regulatory_compliance_checklist.senelec_tva_compliance}
2. Exonération du timbre fiscal pour paiements digitaux : ${adminAuditReport.regulatory_compliance_checklist.droit_de_timbre_cash_compliance}
3. Application stricte du 1% de timbre fiscal pour règlements CASH : ${adminAuditReport.regulatory_compliance_checklist.droit_de_timbre_cash_compliance}

-----------------------------------------------------------
FIN DU RAPPORT - VÉRIFICATION IMMUABLE CRSE / Impôts Sénégal`}
                </div>
                <button className="btn-premium btn-premium-primary" onClick={() => window.print()}>
                  Exporter le Rapport CRSE/SONES
                </button>
              </GlassCard>
            </motion.div>
          )}

          {/* TAB 5: PROFILE */}
          {currentTab === 'profile' && userProfile?.role !== 'ADMIN' && (
            <motion.div key="profile" className="profile-grid" {...tabTransition}>
              <GlassCard style={{ padding: 24 }} hoverScale={false}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', borderBottom: '1.5px solid var(--border-color)', paddingBottom: 16, marginBottom: 20 }}>
                  <div 
                    style={{ 
                      width: 52, 
                      height: 52, 
                      borderRadius: '50%', 
                      background: 'var(--color-primary-light)', 
                      color: 'var(--color-primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 900, 
                      fontSize: 20, 
                      border: '1.5px solid var(--border-color)'
                    }}
                  >
                    {userProfile?.nom?.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800 }}>{userProfile?.nom}</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{userProfile?.email}</span>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile}>
                  <div className="form-group">
                    <label>Budget Mensuel Limite (FCFA)</label>
                    <div className="input-wrapper">
                      <DollarSign size={18} />
                      <input 
                        type="number" 
                        value={profileBudget === 0 ? '' : profileBudget}
                        placeholder="0"
                        onChange={(e) => setProfileBudget(Math.max(0, parseInt(e.target.value) || 0))}
                        required
                      />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'block', fontWeight: 500 }}>
                      Vous recevrez une alerte si vos recharges du mois dépassent cette limite.
                    </span>
                  </div>

                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label>Type de commune (Eau)</label>
                    <div className="input-wrapper">
                      <MapPin size={18} />
                      <select 
                        value={profileVilleType}
                        onChange={(e) => setProfileVilleType(e.target.value as any)}
                      >
                        <option value="NON_ASSAINIE">Non Assainie (Sans Égouts)</option>
                        <option value="ASSAINIE">Assainie (Avec Égouts)</option>
                      </select>
                    </div>
                  </div>

                  {profileSuccessMsg && (
                    <div 
                      style={{ 
                        padding: 10, 
                        background: 'var(--color-primary-light)', 
                        borderRadius: 12, 
                        fontSize: 12, 
                        color: 'var(--color-primary)', 
                        marginBottom: 16,
                        fontWeight: 700
                      }}
                    >
                      {profileSuccessMsg}
                    </div>
                  )}

                  <button type="submit" className="btn-premium btn-premium-primary" style={{ marginBottom: 12 }}>
                    Enregistrer les paramètres
                  </button>
                </form>

                <button 
                  className="btn-premium btn-premium-secondary" 
                  onClick={handleLogout} 
                  style={{ color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  <LogOut size={16} />
                  Se déconnecter
                </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM MOBILE NAVIGATION */}
      <BottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} userProfile={userProfile} />
    </div>
  );
}
