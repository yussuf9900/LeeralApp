import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ArrowLeft, 
  User, 
  Mail, 
  Lock, 
  MapPin, 
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

interface AuthCardProps {
  onBack: () => void;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
  error: string;
  setError: (err: string) => void;
  onOpenLegalModal?: (tab: 'mentions' | 'confidentialite' | 'cgu' | 'cookies') => void;
  initialResetToken?: string | null;
  initialResetEmail?: string | null;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET';

export default function AuthCard({
  onBack,
  onSubmit,
  loading,
  error,
  setError,
  onOpenLegalModal,
  initialResetToken,
  initialResetEmail
}: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>(initialResetToken ? 'RESET' : 'LOGIN');
  
  // Registration & Login fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialResetEmail || '');
  const [password, setPassword] = useState('');
  const [villeType, setVilleType] = useState<'ASSAINIE' | 'NON_ASSAINIE'>('NON_ASSAINIE');
  const [isSubvented, setIsSubvented] = useState(false);

  // Forgot / Reset fields
  const [resetToken, setResetToken] = useState(initialResetToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (initialResetToken) {
      setResetToken(initialResetToken);
      setMode('RESET');
    }
  }, [initialResetToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    onSubmit({
      isLogin: mode === 'LOGIN',
      name,
      email,
      password,
      villeType,
      isSubvented
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotSuccessMsg('');
    if (!email) {
      setError('Veuillez renseigner votre adresse email.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotSuccessMsg(data.message || 'Si un compte correspond à cet email, un lien vous a été envoyé.');
      } else {
        setError(data.error || 'Erreur lors de la demande de réinitialisation.');
      }
    } catch (_err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccessMsg('');

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, nouveau_mot_de_passe: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccessMsg(data.message || 'Mot de passe réinitialisé avec succès !');
        setTimeout(() => {
          setMode('LOGIN');
          setResetSuccessMsg('');
        }, 2500);
      } else {
        setError(data.error || 'Erreur lors de la réinitialisation.');
      }
    } catch (_err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      >
        {/* Back Button */}
        <button 
          onClick={mode === 'FORGOT' || mode === 'RESET' ? () => { setMode('LOGIN'); setError(''); } : onBack}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            fontSize: 13, 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 6, 
            cursor: 'pointer', 
            marginBottom: 24, 
            padding: 0,
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} />
          {mode === 'FORGOT' || mode === 'RESET' ? 'Retour à la connexion' : 'Retour'}
        </button>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <Zap size={28} color="#f59e0b" fill="#f59e0b" style={{ filter: 'drop-shadow(0 2px 6px rgba(245,158,11,0.3))' }} />
            <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em' }}>LEERAL</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
            {mode === 'LOGIN' && "Ravi de vous revoir ! Connectez-vous à votre espace."}
            {mode === 'REGISTER' && "Créez votre profil de budget d'énergie personnel."}
            {mode === 'FORGOT' && "Récupération sécurisée de votre mot de passe."}
            {mode === 'RESET' && "Définissez un nouveau mot de passe pour votre compte."}
          </p>
        </div>

        {/* Tab Toggle (Only in LOGIN or REGISTER) */}
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
          <div className="auth-tabs">
            <button 
              type="button"
              className={`auth-tab-btn ${mode === 'LOGIN' ? 'active' : ''}`}
              onClick={() => { setMode('LOGIN'); setError(''); }}
            >
              Connexion
            </button>
            <button 
              type="button"
              className={`auth-tab-btn ${mode === 'REGISTER' ? 'active' : ''}`}
              onClick={() => { setMode('REGISTER'); setError(''); }}
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* LOGIN / REGISTER FORM */}
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === 'LOGIN' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'LOGIN' ? 10 : -10 }}
                transition={{ duration: 0.2 }}
              >
                {mode === 'REGISTER' && (
                  <div className="form-group">
                    <label>Nom complet</label>
                    <div className="input-wrapper">
                      <User size={18} />
                      <input 
                        type="text" 
                        placeholder="Mamadou Sow" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Adresse Email</label>
                  <div className="input-wrapper">
                    <Mail size={18} />
                    <input 
                      type="email" 
                      placeholder="mamadou@gmail.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: mode === 'LOGIN' ? 12 : 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Mot de passe</label>
                    {mode === 'LOGIN' && (
                      <button
                        type="button"
                        onClick={() => { setMode('FORGOT'); setError(''); }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="input-wrapper">
                    <Lock size={18} />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {mode === 'REGISTER' && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Minimum 8 caractères.
                    </span>
                  )}
                </div>

                {mode === 'REGISTER' && (
                  <>
                    <div className="form-group">
                      <label>Zone d'assainissement (Eau)</label>
                      <div className="option-select-row">
                        <button 
                          type="button"
                          className={`option-select-btn ${villeType === 'NON_ASSAINIE' ? 'active' : ''}`}
                          onClick={() => setVilleType('NON_ASSAINIE')}
                        >
                          <MapPin size={18} />
                          <span>Non Assainie</span>
                          <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>Pas d'égouts</span>
                        </button>
                        <button 
                          type="button"
                          className={`option-select-btn ${villeType === 'ASSAINIE' ? 'active' : ''}`}
                          onClick={() => setVilleType('ASSAINIE')}
                        >
                          <MapPin size={18} />
                          <span>Assainie</span>
                          <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>Avec égouts</span>
                        </button>
                      </div>
                    </div>

                    <div 
                      className="toggle-switch-container"
                      onClick={() => setIsSubvented(!isSubvented)}
                      style={{ marginBottom: 20 }}
                    >
                      <span style={{ color: isSubvented ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                        Bénéficier du tarif social (Subventionné)
                      </span>
                      <div style={{ 
                        width: 44, 
                        height: 24, 
                        background: isSubvented ? 'var(--color-primary)' : 'var(--border-color)', 
                        borderRadius: 12, 
                        padding: 2, 
                        display: 'flex', 
                        justifyContent: isSubvented ? 'flex-end' : 'flex-start',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}>
                        <motion.div 
                          layout
                          style={{ width: 20, height: 20, background: 'white', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} 
                        />
                      </div>
                    </div>

                    {/* Mention légale CDP & CGU */}
                    <div style={{ 
                      fontSize: 11, 
                      color: 'var(--text-muted)', 
                      lineHeight: 1.5, 
                      marginBottom: 20,
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)'
                    }}>
                      En vous inscrivant, vous acceptez nos{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegalModal?.('cgu')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        CGU
                      </button>
                      {' '}et notre{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegalModal?.('confidentialite')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Politique de Confidentialité CDP
                      </button>
                      {' '}(Loi n° 2008-12 du Sénégal).
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.div 
                className="alert-banner"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ marginBottom: 16 }}
              >
                <AlertTriangle size={18} />
                <span>{error}</span>
              </motion.div>
            )}

            <button type="submit" className="btn-premium btn-premium-primary" disabled={loading}>
              {loading ? 'Traitement en cours...' : mode === 'LOGIN' ? 'Se connecter' : "Valider mon inscription"}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {mode === 'FORGOT' && (
          <form onSubmit={handleForgotPassword}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              margin: '0 auto 20px auto'
            }}>
              <KeyRound size={26} />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Votre adresse email de connexion</label>
              <div className="input-wrapper">
                <Mail size={18} />
                <input 
                  type="email" 
                  placeholder="votre-email@domaine.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                Un lien de réinitialisation à usage unique (valable 1 heure) vous sera envoyé.
              </span>
            </div>

            {forgotSuccessMsg && (
              <div style={{
                padding: '12px 14px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 12,
                color: '#10b981',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 20
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{forgotSuccessMsg}</span>
              </div>
            )}

            {error && (
              <div className="alert-banner" style={{ marginBottom: 16 }}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-premium btn-premium-primary" 
              disabled={actionLoading}
            >
              {actionLoading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
            </button>
          </form>
        )}

        {/* RESET PASSWORD VIEW */}
        {mode === 'RESET' && (
          <form onSubmit={handleResetPassword}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              margin: '0 auto 20px auto'
            }}>
              <ShieldCheck size={26} />
            </div>

            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input 
                  type="password" 
                  placeholder="Au moins 8 caractères" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Confirmer le mot de passe</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input 
                  type="password" 
                  placeholder="Répétez le mot de passe" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {resetSuccessMsg && (
              <div style={{
                padding: '12px 14px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 12,
                color: '#10b981',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 20
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            {error && (
              <div className="alert-banner" style={{ marginBottom: 16 }}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-premium btn-premium-primary" 
              disabled={actionLoading}
            >
              {actionLoading ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
