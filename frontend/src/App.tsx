import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Droplet, 
  History, 
  Users, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  Sun, 
  Moon, 
  CreditCard, 
  FileText, 
  DollarSign, 
  Activity, 
  AlertCircle, 
  Printer, 
  X
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:3001/api/v1';

// TypeScript models from backend definitions
interface UserProfile {
  id: string;
  nom: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  is_subvented: boolean;
  ville_type: 'ASSAINIE' | 'NON_ASSAINIE';
  cree_a?: string;
}

interface Invoice {
  id: string;
  utilisateur_id: string;
  service: 'SENELEC' | 'SENEAU';
  reference_facture: string;
  consommation: string;
  montant_ht: string;
  tva: string;
  redevance: string;
  droit_de_timbre: string;
  montant_ttc: string;
  mode_paiement: 'CASH' | 'DIGITAL';
  statut: 'PAYE' | 'NON_PAYE' | 'ANNULE';
  date_echeance: string;
  idempotency_key: string;
  cree_a: string;
  paye_a?: string;
  client_name?: string;
  client_email?: string;
}

interface Tariff {
  id: number;
  service: 'SENELEC' | 'SENEAU';
  type_tarif: string;
  prix_par_unite: string;
  palier_debut: string;
  palier_fin: string | null;
  cree_a: string;
}

interface AuditReport {
  report_timestamp: string;
  target_regulation: string;
  metrics: {
    total_transactions: number;
    total_ht: number;
    total_tva: number;
    total_timbre: number;
    total_ttc: number;
    electricity_consumed_kwh: number;
    water_consumed_m3: number;
  };
  payment_splits: Array<{
    mode: string;
    count: number;
    total_ttc: number;
    total_timbre: number;
  }>;
  regulatory_compliance_checklist: {
    senelec_tva_compliance: string;
    droit_de_timbre_cash_compliance: string;
    integrity_hash: string;
  };
}

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Auth form states
  const [authNom, setAuthNom] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState<'CLIENT' | 'ADMIN'>('CLIENT');
  const [authSubvented, setAuthSubvented] = useState(false);
  const [authVilleType, setAuthVilleType] = useState<'ASSAINIE' | 'NON_ASSAINIE'>('NON_ASSAINIE');

  // App settings & view states
  const [theme, setTheme] = useState<'light' | 'dark'>(localStorage.getItem('theme') as 'light' | 'dark' || 'light');
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);

  // Billing simulator states
  const [consoSenelec, setConsoSenelec] = useState<number>(180);
  const [payModeSenelec, setPayModeSenelec] = useState<'CASH' | 'DIGITAL'>('DIGITAL');
  
  const [consoSeneau, setConsoSeneau] = useState<number>(30);
  const [payModeSeneau, setPayModeSeneau] = useState<'CASH' | 'DIGITAL'>('DIGITAL');
  const [includeCaution, setIncludeCaution] = useState(false);
  const [calibreSeneau, setCalibreSeneau] = useState<number>(15);

  // Dynamic calculations previews
  const [previewSenelec, setPreviewSenelec] = useState<any>(null);
  const [previewSeneau, setPreviewSeneau] = useState<any>(null);

  // Focus Invoice Receipt Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // References for interactive canvas elements
  const senelecCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const seneauCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const senelecAnimationRef = useRef<number | null>(null);
  const seneauAnimationRef = useRef<number | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  useEffect(() => {
    if (currentUser) {
      fetchBillingHistory();
      if (currentUser.role === 'ADMIN') {
        fetchTariffs();
        fetchUsers();
        fetchAuditReport();
      }
    }
  }, [currentUser]);

  // Recalculate Senelec bill preview dynamically
  useEffect(() => {
    if (consoSenelec >= 0) {
      calculateSenelecPreview();
    }
  }, [consoSenelec, payModeSenelec]);

  // Recalculate Seneau bill preview dynamically
  useEffect(() => {
    if (consoSeneau >= 0) {
      calculateSeneauPreview();
    }
  }, [consoSeneau, payModeSeneau, includeCaution, calibreSeneau]);

  // Canvas animations triggers
  useEffect(() => {
    if (activeTab === 'DASHBOARD' && currentUser?.role === 'CLIENT') {
      initSenelecCanvas();
      initSeneauCanvas();
    }
    return () => {
      if (senelecAnimationRef.current) cancelAnimationFrame(senelecAnimationRef.current);
      if (seneauAnimationRef.current) cancelAnimationFrame(seneauAnimationRef.current);
    };
  }, [activeTab, currentUser, consoSenelec, consoSeneau]);

  // --- NETWORK SERVICE CALLS ---
  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      } else {
        handleLogout();
      }
    } catch (err) {
      handleLogout();
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/facturation/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTariffs = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/tarifs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTariffs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/utilisateurs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/audit/rapport-annuel`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditReport(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Local/Stateless Calculations Previews (simulating backend rules)
  const calculateSenelecPreview = () => {
    // Basic brackets & pricing:
    // Tranche 1: 91 * 0.90 = 81.90 up to 150 kWh
    // Tranche 2: 136.49 for 150+ kWh
    const priceT1 = 91.00 * 0.90;
    const priceT2 = 136.49;
    
    let ht = 0;
    if (consoSenelec <= 150) {
      ht = consoSenelec * priceT1;
    } else {
      ht = (150 * priceT1) + ((consoSenelec - 150) * priceT2);
    }

    // TVA 18% applied only on consumption portion > 250 kWh
    let tva = 0;
    if (consoSenelec > 250) {
      const excess = consoSenelec - 250;
      tva = (excess * priceT2) * 0.18;
    }

    // Redevance/Frais fixes: let's assume it is 429
    // Wait, the client only pays it on their first transaction. We can display it as conditional.
    // In our preview, let's assume it's first transaction of month for transparency.
    const redevance = 429;
    
    const subtotal = ht + tva + redevance;
    const stamp = payModeSenelec === 'CASH' ? subtotal * 0.01 : 0;
    const ttc = subtotal + stamp;

    setPreviewSenelec({
      ht: ht.toFixed(2),
      tva: tva.toFixed(2),
      redevance: redevance.toFixed(2),
      stamp: stamp.toFixed(2),
      ttc: ttc.toFixed(2)
    });
  };

  const calculateSeneauPreview = () => {
    // Brackets: social up to 20, pleine 20 to 40, dissuasive 40+ (multiplied by 2 for bimestriel)
    // Assainie rates: 202, 697.97, 878.35
    // Non-Assainie rates: 188.50, 636.34, 778.87
    const isAssainie = currentUser?.ville_type === 'ASSAINIE';
    const priceSocial = isAssainie ? 202.00 : 188.50;
    const pricePleine = isAssainie ? 697.97 : 636.34;
    const priceDissuasive = isAssainie ? 878.35 : 778.87;

    let ht = 0;
    if (consoSeneau <= 20) {
      ht = consoSeneau * priceSocial;
    } else if (consoSeneau <= 40) {
      ht = (20 * priceSocial) + ((consoSeneau - 20) * pricePleine);
    } else {
      ht = (20 * priceSocial) + (20 * pricePleine) + ((consoSeneau - 40) * priceDissuasive);
    }

    const tva = 0; // Domestic water is exempt

    // Caution branching
    let caution = 0;
    if (includeCaution) {
      const volumeRef = calibreSeneau === 15 ? 50 : calibreSeneau === 20 ? 225 : calibreSeneau === 25 ? 375 : calibreSeneau === 30 ? 600 : 975;
      const cautionPrice = currentUser?.is_subvented ? 202.00 : 697.97;
      caution = volumeRef * cautionPrice;
    }

    const subtotal = ht + tva + caution;
    const stamp = payModeSeneau === 'CASH' ? subtotal * 0.01 : 0;
    const ttc = subtotal + stamp;

    setPreviewSeneau({
      ht: ht.toFixed(2),
      tva: tva.toFixed(2),
      caution: caution.toFixed(2),
      stamp: stamp.toFixed(2),
      ttc: ttc.toFixed(2)
    });
  };

  // --- ACTIONS ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const url = authMode === 'LOGIN' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
    const payload = authMode === 'LOGIN' 
      ? { email: authEmail, mot_de_passe: authPassword }
      : { 
          nom: authNom, 
          email: authEmail, 
          mot_de_passe: authPassword, 
          role: authRole,
          is_subvented: authSubvented,
          ville_type: authVilleType
        };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        setSuccessMessage('Connexion réussie !');
      } else {
        setErrorMessage(data.error || 'Une erreur est survenue.');
      }
    } catch (err) {
      setErrorMessage('Impossible de contacter le serveur backend.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCurrentUser(null);
    setActiveTab('DASHBOARD');
  };

  const triggerSenelecCalculation = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const idKey = `IDEM-WOY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
      const res = await fetch(`${API_BASE}/facturation/senelec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idKey
        },
        body: JSON.stringify({
          consommation: consoSenelec,
          mode_paiement: payModeSenelec
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
        fetchBillingHistory();
      } else {
        setErrorMessage(data.error || 'Erreur de facturation.');
      }
    } catch (err) {
      setErrorMessage('Erreur réseau lors de la transaction.');
    }
  };

  const triggerSeneauCalculation = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const idKey = `IDEM-EAU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
      const res = await fetch(`${API_BASE}/facturation/seneau`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idKey
        },
        body: JSON.stringify({
          consommation: consoSeneau,
          mode_paiement: payModeSeneau,
          include_caution: includeCaution,
          calibre: calibreSeneau
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
        fetchBillingHistory();
      } else {
        setErrorMessage(data.error || 'Erreur de facturation.');
      }
    } catch (err) {
      setErrorMessage('Erreur réseau lors de la transaction.');
    }
  };

  const handlePayBill = async (billId: string) => {
    try {
      const res = await fetch(`${API_BASE}/facturation/pay/${billId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
        fetchBillingHistory();
        if (currentUser?.role === 'ADMIN') {
          fetchAuditReport();
        }
      } else {
        setErrorMessage(data.error || 'Paiement échoué.');
      }
    } catch (err) {
      setErrorMessage('Erreur réseau.');
    }
  };

  // Tariff update (Admin only)
  const handleUpdateTariff = async (tariffId: number, prix: number) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/tarifs/${tariffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prix_par_unite: prix })
      });
      if (res.ok) {
        setSuccessMessage('Tarif mis à jour avec succès.');
        fetchTariffs();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Erreur de mise à jour.');
      }
    } catch (err) {
      setErrorMessage('Erreur réseau.');
    }
  };

  // User details update (Admin only)
  const handleUpdateUser = async (userId: string, role: string, isSubvented: boolean, vType: string) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/utilisateurs/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role,
          is_subvented: isSubvented,
          ville_type: vType
        })
      });
      if (res.ok) {
        setSuccessMessage('Profil mis à jour avec succès.');
        fetchUsers();
      } else {
        const data = await res.json();
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Erreur réseau.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/utilisateurs/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMessage('Utilisateur supprimé.');
        fetchUsers();
      }
    } catch (err) {
      setErrorMessage('Erreur réseau.');
    }
  };

  // --- CANVAS INTERACTIVE GRAPHICS DRAWING ---
  const initSenelecCanvas = () => {
    const canvas = senelecCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rotation = 0;
    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      // Draw grid/background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw shiny mechanical meter disk
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 45, 0, Math.PI * 2);
      ctx.stroke();

      // Disc details
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();

      // Disc indicator mark (red wedge)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 42, -0.2, 0.2);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();

      // Draw counter box
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - 70, cy - 50, 140, 30, 4);
      ctx.fill();
      ctx.stroke();

      // Draw values digits
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${consoSenelec.toFixed(1)} kWh`, cx, cy - 35);

      // Pulse speed relative to consumption
      const speed = consoSenelec > 0 ? (consoSenelec / 300) + 0.01 : 0;
      rotation += speed;

      senelecAnimationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const initSeneauCanvas = () => {
    const canvas = seneauCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw water pipe container
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, 55, 0, Math.PI * 2);
      ctx.stroke();

      // Draw water wave based on consumption level
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 51, 0, Math.PI * 2);
      ctx.clip();

      // Calculate fill height (capped at 100%)
      const fillPercent = Math.min(consoSeneau / 150, 1);
      const fillHeight = cy + 50 - (fillPercent * 100);

      // Wave path
      ctx.fillStyle = 'rgba(14, 165, 233, 0.85)';
      ctx.beginPath();
      ctx.moveTo(cx - 60, fillHeight);
      
      for (let x = cx - 60; x <= cx + 60; x++) {
        const y = fillHeight + Math.sin((x + offset) * 0.05) * 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(cx + 60, cy + 60);
      ctx.lineTo(cx - 60, cy + 60);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Text value
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${consoSeneau.toFixed(1)} m³`, cx, cy);

      offset += 2;
      seneauAnimationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const handlePrint = () => {
    window.print();
  };

  // --- RENDERS ---
  if (!token || !currentUser) {
    return (
      <div className="auth-wrapper">
        <form className="auth-card animate-slide-up" onSubmit={handleAuthSubmit}>
          <div className="auth-header">
            <h1>Leeral API</h1>
            <p>Facturation Multiservices Senelec & Sen’Eau</p>
          </div>

          {errorMessage && (
            <div style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-light)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', gap: '0.5rem', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div style={{ color: 'var(--color-success)', backgroundColor: 'var(--color-success-light)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', gap: '0.5rem', fontSize: '0.9rem' }}>
              <ShieldCheck size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {authMode === 'REGISTER' && (
            <div className="form-group">
              <label>Nom Complet</label>
              <input 
                type="text" 
                placeholder="Ex: Ibrahima Diop" 
                value={authNom} 
                onChange={e => setAuthNom(e.target.value)} 
              />
            </div>
          )}

          <div className="form-group">
            <label>Adresse Email</label>
            <input 
              type="email" 
              placeholder="Ex: ibrahima@email.sn" 
              value={authEmail} 
              onChange={e => setAuthEmail(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input 
              type="password" 
              placeholder="Votre mot de passe secret" 
              value={authPassword} 
              onChange={e => setAuthPassword(e.target.value)} 
            />
          </div>

          {authMode === 'REGISTER' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Rôle</label>
                  <select value={authRole} onChange={e => setAuthRole(e.target.value as any)}>
                    <option value="CLIENT">Client / Abonné</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Réseau Égouts</label>
                  <select value={authVilleType} onChange={e => setAuthVilleType(e.target.value as any)}>
                    <option value="NON_ASSAINIE">Non Assaini (Sans)</option>
                    <option value="ASSAINIE">Assaini (Avec Égouts)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="subCheckbox"
                  checked={authSubvented} 
                  onChange={e => setAuthSubvented(e.target.checked)} 
                />
                <label htmlFor="subCheckbox" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Éligible à la Subvention Sociale
                </label>
              </div>
            </>
          )}

          <button className="btn btn-primary" type="submit" style={{ marginTop: '1rem' }}>
            {authMode === 'LOGIN' ? 'Se Connecter' : "Créer mon Compte"}
          </button>

          <div className="auth-toggle" onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}>
            {authMode === 'LOGIN' ? (
              <>Nouveau sur Leeral ? <span>Créez un compte</span></>
            ) : (
              <>Déjà inscrit ? <span>Connectez-vous</span></>
            )}
          </div>
        </form>
      </div>
    );
  }

  // --- FULL LAYOUT RENDERING ---
  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="brand-wrapper">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">Leeral</span>
        </div>

        <nav className="nav-links">
          <div 
            className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
            onClick={() => setActiveTab('DASHBOARD')}
          >
            <Zap size={20} />
            <span>Tableau de Bord</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveTab('HISTORY')}
          >
            <History size={20} />
            <span>Historique Factures</span>
          </div>

          {currentUser.role === 'ADMIN' && (
            <>
              <div 
                className={`nav-item ${activeTab === 'TARIFFS' ? 'active' : ''}`}
                onClick={() => setActiveTab('TARIFFS')}
              >
                <Settings size={20} />
                <span>Grilles Tarifaires</span>
              </div>

              <div 
                className={`nav-item ${activeTab === 'USERS' ? 'active' : ''}`}
                onClick={() => setActiveTab('USERS')}
              >
                <Users size={20} />
                <span>Gestion Utilisateurs</span>
              </div>

              <div 
                className={`nav-item ${activeTab === 'AUDIT' ? 'active' : ''}`}
                onClick={() => setActiveTab('AUDIT')}
              >
                <ShieldCheck size={20} />
                <span>Rapports d'Audit</span>
              </div>
            </>
          )}
        </nav>

        <div className="user-profile-widget">
          <div className="avatar">
            {currentUser.nom.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <span className="name">{currentUser.nom}</span>
            <span className="role-tag">{currentUser.role}</span>
          </div>
          <LogOut 
            size={18} 
            style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--text-muted)' }} 
            onClick={handleLogout}
          />
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-title">
            <h2>
              {activeTab === 'DASHBOARD' && 'Vue d’ensemble'}
              {activeTab === 'HISTORY' && 'Historique des Factures'}
              {activeTab === 'TARIFFS' && 'Configuration des Tarifs Réglementaires'}
              {activeTab === 'USERS' && 'Gestion des Accès Clients'}
              {activeTab === 'AUDIT' && 'Centre d’Audit Réglementaire'}
            </h2>
          </div>
          <div className="top-bar-actions">
            <button 
              className="theme-toggle"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        <div className="content-body animate-fade-in">
          {successMessage && (
            <div style={{ color: 'var(--color-success)', backgroundColor: 'var(--color-success-light)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', gap: '0.5rem', fontWeight: 500 }}>
              <ShieldCheck size={20} />
              <span>{successMessage}</span>
              <X size={18} style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => setSuccessMessage('')} />
            </div>
          )}

          {errorMessage && (
            <div style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-light)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', gap: '0.5rem', fontWeight: 500 }}>
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
              <X size={18} style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => setErrorMessage('')} />
            </div>
          )}

          {/* TAB: DASHBOARD (Client view) */}
          {activeTab === 'DASHBOARD' && currentUser.role === 'CLIENT' && (
            <>
              {/* Client Metrics */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Total Dépensé</span>
                    <span className="stat-value">
                      {invoices.reduce((acc, inv) => inv.statut === 'PAYE' ? acc + parseFloat(inv.montant_ttc) : acc, 0).toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    <DollarSign size={24} />
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Volume Électricité</span>
                    <span className="stat-value">
                      {invoices.filter(i => i.service === 'SENELEC').reduce((acc, inv) => acc + parseFloat(inv.consommation), 0).toFixed(1)} kWh
                    </span>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                    <Zap size={24} />
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Volume Eau Consommé</span>
                    <span className="stat-value">
                      {invoices.filter(i => i.service === 'SENEAU').reduce((acc, inv) => acc + parseFloat(inv.consommation), 0).toFixed(1)} m³
                    </span>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
                    <Droplet size={24} />
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Factures Non Payées</span>
                    <span className="stat-value" style={{ color: 'var(--color-danger)' }}>
                      {invoices.filter(i => i.statut === 'NON_PAYE').length}
                    </span>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                    <FileText size={24} />
                  </div>
                </div>
              </div>

              {/* Billing engines simulators */}
              <div className="services-section">
                {/* Senelec Woyofal engine */}
                <div className="service-card">
                  <div className="service-header senelec">
                    <div className="service-header-title">
                      <Zap size={22} />
                      <h3>Moteur Senelec (Woyofal)</h3>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Prépaiement</span>
                  </div>

                  <div className="service-body">
                    {/* Meter Canvas animation */}
                    <div className="canvas-preview-container">
                      <canvas ref={senelecCanvasRef} width={400} height={150} />
                      <div className="canvas-metrics-overlay">woyofal_active</div>
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'between', width: '100%' }}>
                        <label>Consommation d'Énergie à recharger</label>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--color-warning)' }}>{consoSenelec} kWh</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="1000" 
                        value={consoSenelec} 
                        onChange={e => setConsoSenelec(parseInt(e.target.value, 10))} 
                      />
                    </div>

                    <div className="form-group">
                      <label>Canal de Paiement</label>
                      <select value={payModeSenelec} onChange={e => setPayModeSenelec(e.target.value as any)}>
                        <option value="DIGITAL">Digital (Mobile Money, Carte - Exonéré Timbre)</option>
                        <option value="CASH">CASH (Espèces en guichet - 1% Surcharge Timbre)</option>
                      </select>
                    </div>

                    {previewSenelec && (
                      <div className="bill-preview">
                        <div className="bill-preview-header">Aperçu Facture</div>
                        <div className="preview-row">
                          <span>Montant Consommation (HT) :</span>
                          <span>{parseFloat(previewSenelec.ht).toLocaleString('fr-FR')} F</span>
                        </div>
                        <div className="preview-row">
                          <span>Redevance Fixe Mensuelle :</span>
                          <span>{parseFloat(previewSenelec.redevance) > 0 ? `${parseFloat(previewSenelec.redevance).toLocaleString('fr-FR')} F` : 'Déjà payée / 0 F'}</span>
                        </div>
                        <div className="preview-row">
                          <span>Portion TVA (18% &gt; 250kWh) :</span>
                          <span>{parseFloat(previewSenelec.tva).toLocaleString('fr-FR')} F</span>
                        </div>
                        <div className="preview-row">
                          <span>Droit de Timbre (1%) :</span>
                          <span>{parseFloat(previewSenelec.stamp).toLocaleString('fr-FR')} F</span>
                        </div>
                        <div className="preview-row total">
                          <span>Montant Total TTC :</span>
                          <span>{parseFloat(previewSenelec.ttc).toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>
                    )}

                    <button className="btn btn-primary" onClick={triggerSenelecCalculation} style={{ backgroundColor: 'var(--color-senelec)', color: 'black', boxShadow: 'none' }}>
                      <CreditCard size={18} />
                      Acheter Crédit Woyofal
                    </button>
                  </div>
                </div>

                {/* Sen'Eau water engine */}
                <div className="service-card">
                  <div className="service-header seneau">
                    <div className="service-header-title">
                      <Droplet size={22} />
                      <h3>Moteur Sen’Eau (Eau)</h3>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Bimestriel</span>
                  </div>

                  <div className="service-body">
                    {/* Water flow Canvas animation */}
                    <div className="canvas-preview-container">
                      <canvas ref={seneauCanvasRef} width={400} height={150} />
                      <div className="canvas-metrics-overlay">flow_active</div>
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'between', width: '100%' }}>
                        <label>Consommation d'Eau (Bimestrielle)</label>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--color-seneau)' }}>{consoSeneau} m³</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="200" 
                        value={consoSeneau} 
                        onChange={e => setConsoSeneau(parseInt(e.target.value, 10))} 
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Mode de Règlement</label>
                        <select value={payModeSeneau} onChange={e => setPayModeSeneau(e.target.value as any)}>
                          <option value="DIGITAL">Digital</option>
                          <option value="CASH">CASH (Guichet)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Calibre du Compteur</label>
                        <select value={calibreSeneau} onChange={e => setCalibreSeneau(parseInt(e.target.value, 10))}>
                          <option value="15">15 mm (Domestique Standard)</option>
                          <option value="20">20 mm</option>
                          <option value="25">25 mm</option>
                          <option value="30">30 mm</option>
                          <option value="40">40 mm</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                      <input 
                        type="checkbox" 
                        id="cautionCheck"
                        checked={includeCaution} 
                        onChange={e => setIncludeCaution(e.target.checked)} 
                      />
                      <label htmlFor="cautionCheck" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        Inclure la Caution de Branchement Initial
                      </label>
                    </div>

                    {previewSeneau && (
                      <div className="bill-preview">
                        <div className="bill-preview-header">Aperçu Facture d'Eau</div>
                        <div className="preview-row">
                          <span>Montant Consommation (HT) :</span>
                          <span>{parseFloat(previewSeneau.ht).toLocaleString('fr-FR')} F</span>
                        </div>
                        {includeCaution && (
                          <div className="preview-row">
                            <span>Caution de Branchement :</span>
                            <span>{parseFloat(previewSeneau.caution).toLocaleString('fr-FR')} F</span>
                          </div>
                        )}
                        <div className="preview-row">
                          <span>TVA Facturée (0% Social/Maison) :</span>
                          <span>0 F</span>
                        </div>
                        <div className="preview-row">
                          <span>Droit de Timbre (1% CASH) :</span>
                          <span>{parseFloat(previewSeneau.stamp).toLocaleString('fr-FR')} F</span>
                        </div>
                        <div className="preview-row total">
                          <span>Montant Total à Payer :</span>
                          <span>{parseFloat(previewSeneau.ttc).toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>
                    )}

                    <button className="btn btn-primary" onClick={triggerSeneauCalculation} style={{ backgroundColor: 'var(--color-seneau)', color: 'white', boxShadow: 'none' }}>
                      <CreditCard size={18} />
                      Générer Facture d'Eau
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB: DASHBOARD (Admin view) */}
          {activeTab === 'DASHBOARD' && currentUser.role === 'ADMIN' && (
            <>
              {/* Financial metrics sums */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Recettes Totales (TTC)</span>
                    <span className="stat-value">
                      {invoices.reduce((acc, inv) => inv.statut === 'PAYE' ? acc + parseFloat(inv.montant_ttc) : acc, 0).toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                    <DollarSign size={24} />
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">En-cours (Non Payés)</span>
                    <span className="stat-value" style={{ color: 'var(--color-warning)' }}>
                      {invoices.filter(i => i.statut === 'NON_PAYE').reduce((acc, inv) => acc + parseFloat(inv.montant_ttc), 0).toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                    <Activity size={24} />
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Transactions Total</span>
                    <span className="stat-value">{invoices.length}</span>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    <FileText size={24} />
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Nombre de Clients</span>
                    <span className="stat-value">{users.filter(u => u.role === 'CLIENT').length}</span>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
                    <Users size={24} />
                  </div>
                </div>
              </div>

              {/* Transactions list split */}
              <div className="history-section">
                <div className="history-header">
                  <h3>Toutes les Factures du Système</h3>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Référence</th>
                        <th>Date</th>
                        <th>Service</th>
                        <th>Mode</th>
                        <th>Consommation</th>
                        <th>Montant TTC</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aucune facture enregistrée dans le système.</td>
                        </tr>
                      ) : (
                        invoices.map(inv => (
                          <tr key={inv.id}>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>{inv.client_name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{inv.client_email}</span>
                              </div>
                            </td>
                            <td>{inv.reference_facture}</td>
                            <td>{new Date(inv.cree_a).toLocaleDateString('fr-FR')}</td>
                            <td>
                              <span className={`badge ${inv.service === 'SENELEC' ? 'badge-senelec' : 'badge-seneau'}`}>
                                {inv.service}
                              </span>
                            </td>
                            <td>{inv.mode_paiement}</td>
                            <td>{inv.consommation} {inv.service === 'SENELEC' ? 'kWh' : 'm³'}</td>
                            <td>{parseFloat(inv.montant_ttc).toLocaleString('fr-FR')} F</td>
                            <td>
                              <span className={`badge ${inv.statut === 'PAYE' ? 'badge-paye' : 'badge-non-paye'}`}>
                                {inv.statut}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSelectedInvoice(inv)}>
                                  Détails
                                </button>
                                {inv.statut === 'NON_PAYE' && (
                                  <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--color-success)' }} onClick={() => handlePayBill(inv.id)}>
                                    Encaisser
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB: HISTORY (Common to both) */}
          {activeTab === 'HISTORY' && (
            <div className="history-section">
              <div className="history-header">
                <h3>{currentUser.role === 'ADMIN' ? 'Registre Financier Global' : 'Mes Transactions & Factures'}</h3>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      {currentUser.role === 'ADMIN' && <th>Client</th>}
                      <th>Référence</th>
                      <th>Date Émission</th>
                      <th>Service</th>
                      <th>Mode</th>
                      <th>Consommation</th>
                      <th>Montant TTC</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={currentUser.role === 'ADMIN' ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Aucune facture trouvée.
                        </td>
                      </tr>
                    ) : (
                      invoices.map(inv => (
                        <tr key={inv.id}>
                          {currentUser.role === 'ADMIN' && (
                            <td>
                              <span style={{ fontWeight: 600 }}>{inv.client_name || 'Inconnu'}</span>
                            </td>
                          )}
                          <td>{inv.reference_facture}</td>
                          <td>{new Date(inv.cree_a).toLocaleDateString('fr-FR')}</td>
                          <td>
                            <span className={`badge ${inv.service === 'SENELEC' ? 'badge-senelec' : 'badge-seneau'}`}>
                              {inv.service}
                            </span>
                          </td>
                          <td>{inv.mode_paiement}</td>
                          <td>{inv.consommation} {inv.service === 'SENELEC' ? 'kWh' : 'm³'}</td>
                          <td>{parseFloat(inv.montant_ttc).toLocaleString('fr-FR')} F</td>
                          <td>
                            <span className={`badge ${inv.statut === 'PAYE' ? 'badge-paye' : 'badge-non-paye'}`}>
                              {inv.statut}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSelectedInvoice(inv)}>
                                Reçu / Imprimer
                              </button>
                              {inv.statut === 'NON_PAYE' && currentUser.role === 'CLIENT' && (
                                <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--color-success)' }} onClick={() => handlePayBill(inv.id)}>
                                  Payer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: TARIFFS (Admin only) */}
          {activeTab === 'TARIFFS' && currentUser.role === 'ADMIN' && (
            <div className="history-section">
              <div className="history-header">
                <h3>Ajustement des Tarifs Réglementés</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mise à jour en temps réel</span>
              </div>

              <div className="tariff-grid">
                {tariffs.map(t => (
                  <div className="tariff-card" key={t.id}>
                    <div className="tariff-info">
                      <div>
                        <span className={`badge ${t.service === 'SENELEC' ? 'badge-senelec' : 'badge-seneau'}`} style={{ marginBottom: '0.5rem' }}>
                          {t.service}
                        </span>
                        <div className="tariff-title">{t.type_tarif.replace('_', ' ')}</div>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        Palier : {t.palier_debut} - {t.palier_fin || '∞'}
                      </div>
                    </div>

                    <div className="tariff-inputs">
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prix (F CFA) :</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        defaultValue={parseFloat(t.prix_par_unite)}
                        onBlur={e => handleUpdateTariff(t.id, parseFloat(e.target.value))}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>/ unité</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: USERS (Admin only) */}
          {activeTab === 'USERS' && currentUser.role === 'ADMIN' && (
            <div className="history-section">
              <div className="history-header">
                <h3>Gestion des Profils & Paramètres Fiscaux</h3>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Rôle</th>
                      <th>Éligibilité Sociale</th>
                      <th>Zone Assainissement</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td><span style={{ fontWeight: 600 }}>{u.nom}</span></td>
                        <td>{u.email}</td>
                        <td>
                          <select 
                            defaultValue={u.role}
                            onChange={e => handleUpdateUser(u.id, e.target.value, u.is_subvented, u.ville_type)}
                            style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}
                          >
                            <option value="CLIENT">CLIENT</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td>
                          <input 
                            type="checkbox" 
                            defaultChecked={u.is_subvented}
                            onChange={e => handleUpdateUser(u.id, u.role, e.target.checked, u.ville_type)}
                          />
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>Subventionné</span>
                        </td>
                        <td>
                          <select 
                            defaultValue={u.ville_type}
                            onChange={e => handleUpdateUser(u.id, u.role, u.is_subvented, e.target.value)}
                            style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}
                          >
                            <option value="NON_ASSAINIE">Non Assaini (Sans égouts)</option>
                            <option value="ASSAINIE">Assaini (Avec égouts)</option>
                          </select>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }} onClick={() => handleDeleteUser(u.id)}>
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: AUDIT REPORTS (Admin only) */}
          {activeTab === 'AUDIT' && currentUser.role === 'ADMIN' && auditReport && (
            <div className="audit-panel">
              <div className="compliance-grid">
                <div className="compliance-card">
                  <ShieldCheck size={40} style={{ color: 'var(--color-success)' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Validation TVA (Senelec &gt; 250kWh)</div>
                    <div className={`compliance-status ${auditReport.regulatory_compliance_checklist.senelec_tva_compliance.includes('CONFORME') ? 'conforme' : 'anomalie'}`}>
                      {auditReport.regulatory_compliance_checklist.senelec_tva_compliance}
                    </div>
                  </div>
                </div>

                <div className="compliance-card">
                  <ShieldCheck size={40} style={{ color: 'var(--color-success)' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Validation Droit de Timbre (1% CASH)</div>
                    <div className={`compliance-status ${auditReport.regulatory_compliance_checklist.droit_de_timbre_cash_compliance.includes('CONFORME') ? 'conforme' : 'anomalie'}`}>
                      {auditReport.regulatory_compliance_checklist.droit_de_timbre_cash_compliance}
                    </div>
                  </div>
                </div>

                <div className="compliance-card">
                  <Activity size={40} style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Empreinte / Intégrité Audit</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', fontFamily: 'monospace' }}>
                      HASH: {auditReport.regulatory_compliance_checklist.integrity_hash}
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw audit report */}
              <div className="history-section">
                <div className="history-header">
                  <h3>Flux Transactionnels Immuables (OpenTelemetry Structure)</h3>
                  <button className="btn btn-primary" onClick={() => window.print()}>
                    Exporter Rapport CRSE/SONES
                  </button>
                </div>

                <div className="audit-meta-card">
{`RAPPORT DE CONFORMITÉ FINANCIÈRE ET FISCALE
-----------------------------------------------------------
Généré le : ${new Date(auditReport.report_timestamp).toLocaleString('fr-FR')}
Régulation Cible : ${auditReport.target_regulation}
Intégrité Cryptographique : SUCCESS

MÉTRIQUES DE CALCUL GLOBALES :
- Transactions traitées : ${auditReport.metrics.total_transactions}
- Total Montant HT : ${auditReport.metrics.total_ht.toLocaleString('fr-FR')} F CFA
- Total TVA collectée (18%) : ${auditReport.metrics.total_tva.toLocaleString('fr-FR')} F CFA
- Total Droits de Timbre collectés (1% CASH) : ${auditReport.metrics.total_timbre.toLocaleString('fr-FR')} F CFA
- Total Recettes TTC : ${auditReport.metrics.total_ttc.toLocaleString('fr-FR')} F CFA

RECHARGE D'ÉNERGIE GLOBALE (SENELEC) :
- Consommation totale injectée : ${auditReport.metrics.electricity_consumed_kwh.toLocaleString('fr-FR')} kWh

DISTRIBUTION D'EAU GLOBALE (SEN'EAU) :
- Consommation totale distribuée : ${auditReport.metrics.water_consumed_m3.toLocaleString('fr-FR')} m³

RÉPARTITION PAR MODE DE PAIEMENT :
${auditReport.payment_splits.map(s => `- Mode [${s.mode}] : ${s.count} transactions, TTC: ${s.total_ttc.toLocaleString('fr-FR')} F, Timbre: ${s.total_timbre.toLocaleString('fr-FR')} F`).join('\n')}

VÉRIFICATIONS RÉGLEMENTAIRES EFFECTUÉES :
1. Application de la TVA Senelec sur tranche pivot (> 250 kWh uniquement) : ${auditReport.regulatory_compliance_checklist.senelec_tva_compliance}
2. Exonération du timbre fiscal pour paiements digitaux : ${auditReport.regulatory_compliance_checklist.droit_de_timbre_cash_compliance}
3. Application stricte du 1% de timbre fiscal pour règlements CASH : ${auditReport.regulatory_compliance_checklist.droit_de_timbre_cash_compliance}

-----------------------------------------------------------
FIN DU RAPPORT - VÉRIFICATION IMMUABLE CRSE / Impôts Sénégal`}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* POPUP: Printable Invoice Receipt Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <X className="modal-close" onClick={() => setSelectedInvoice(null)} />
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Détail du Reçu Officiel
            </h3>

            <div className="receipt">
              <div className="receipt-header">
                <div className="receipt-brand">
                  <h4>Leeral Multiservices</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Facture Réglementée Sénégal</p>
                </div>
                <div className="receipt-meta">
                  <div>Réf : {selectedInvoice.reference_facture}</div>
                  <div>Émis le : {new Date(selectedInvoice.cree_a).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>

              <div className="receipt-details">
                <div className="receipt-item">
                  <span>Type de Service :</span>
                  <span style={{ fontWeight: 700 }}>{selectedInvoice.service === 'SENELEC' ? 'SENELEC WOYOFAL' : 'SEN\'EAU'}</span>
                </div>
                <div className="receipt-item">
                  <span>Volume Consommé :</span>
                  <span>{selectedInvoice.consommation} {selectedInvoice.service === 'SENELEC' ? 'kWh' : 'm³'}</span>
                </div>
                <div className="receipt-item">
                  <span>Montant Hors-Taxes (HT) :</span>
                  <span>{parseFloat(selectedInvoice.montant_ht).toLocaleString('fr-FR')} F CFA</span>
                </div>
                <div className="receipt-item">
                  <span>Frais / Caution / Redevance :</span>
                  <span>{parseFloat(selectedInvoice.redevance).toLocaleString('fr-FR')} F CFA</span>
                </div>
                <div className="receipt-item">
                  <span>Portion de TVA (18%) :</span>
                  <span>{parseFloat(selectedInvoice.tva).toLocaleString('fr-FR')} F CFA</span>
                </div>
                <div className="receipt-item">
                  <span>Droit de Timbre (1%) :</span>
                  <span>{parseFloat(selectedInvoice.droit_de_timbre).toLocaleString('fr-FR')} F CFA</span>
                </div>
                <div className="receipt-item total">
                  <span>Total TTC :</span>
                  <span>{parseFloat(selectedInvoice.montant_ttc).toLocaleString('fr-FR')} F CFA</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button className="btn btn-primary" style={{ flexGrow: 1 }} onClick={handlePrint}>
                <Printer size={18} />
                Imprimer le Reçu
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
