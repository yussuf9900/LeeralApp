import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { 
  AlertTriangle, 
  Zap, 
  Droplet, 
  DollarSign, 
  MapPin, 
  LogOut 
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

type TabType = 'dashboard' | 'simulator' | 'meters' | 'history' | 'profile';

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

  // Simulator State
  const [simService, setSimService] = useState<'SENELEC' | 'SENEAU'>('SENELEC');
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
      
      if (simService === 'SENELEC') {
        await apiRequest('/api/v1/facturation/senelec', 'POST', {
          ancien_index: simAncienIndex,
          nouvel_index: simNouvelIndex,
          mode_paiement: simModePaiement,
          type_transaction: typeTx,
          save_to_history: true
        }, token);
      } else {
        await apiRequest('/api/v1/facturation/seneau', 'POST', {
          ancien_index: simAncienIndex,
          nouvel_index: simNouvelIndex,
          mode_paiement: simModePaiement,
          ville_type: simVilleType,
          type_transaction: typeTx,
          save_to_history: true
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
  const chartData = dashboardStats ? [
    { name: 'Électricité', Montant: dashboardStats.depenses_senelec, color: '#f59e0b' },
    { name: 'Eau', Montant: dashboardStats.depenses_seneau, color: '#0ea5e9' }
  ] : [];

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
          {/* TAB 1: DASHBOARD */}
          {currentTab === 'dashboard' && (
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
              </div>
            </motion.div>
          )}

          {/* TAB 2: SIMULATOR */}
          {currentTab === 'simulator' && (
            <motion.div key="simulator" className="simulator-grid" {...tabTransition}>
              {/* Left Column */}
              <div className="simulator-left-col">
                {/* Service Tabs */}
                <SegmentedControl 
                  selectedValue={simService}
                  onChange={(val) => {
                    setSimService(val);
                    setSimResult(null);
                  }}
                  activeColorClass={simService === 'SENELEC' ? 'senelec' : 'seneau'}
                  options={[
                    { value: 'SENELEC', label: 'SENELEC (Elec)', icon: <Zap size={16} /> },
                    { value: 'SENEAU', label: "SEN'EAU (Eau)", icon: <Droplet size={16} /> }
                  ]}
                />

                {/* Giant Index Cards */}
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

              {/* Right Column */}
              <div className="simulator-right-col">
                {/* Interactive visual battery or wave indicators */}
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

                {/* Cost invoice presentation receipt */}
                {simResult && (
                  <CostDetails 
                    result={simResult}
                    service={simService}
                    onSave={handleSaveCalculation}
                    saving={simSaving}
                    successMsg={simSuccessMsg}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: METERS */}
          {currentTab === 'meters' && (
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

          {/* TAB 4: HISTORY */}
          {currentTab === 'history' && (
            <motion.div key="history" className="history-grid" {...tabTransition}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Historique de Budget</h3>
              <TransactionList history={history} onPay={handlePayBill} />
            </motion.div>
          )}

          {/* TAB 5: PROFILE */}
          {currentTab === 'profile' && (
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
      <BottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
}
