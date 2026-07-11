import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ArrowLeft, 
  User, 
  Mail, 
  Lock, 
  MapPin, 
  AlertTriangle 
} from 'lucide-react';

interface AuthCardProps {
  onBack: () => void;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
  error: string;
  setError: (err: string) => void;
}

export default function AuthCard({
  onBack,
  onSubmit,
  loading,
  error,
  setError
}: AuthCardProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [villeType, setVilleType] = useState<'ASSAINIE' | 'NON_ASSAINIE'>('NON_ASSAINIE');
  const [isSubvented, setIsSubvented] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    onSubmit({
      isLogin,
      name,
      email,
      password,
      villeType,
      isSubvented
    });
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
          onClick={onBack}
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
          Retour
        </button>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <Zap size={28} color="#f59e0b" fill="#f59e0b" style={{ filter: 'drop-shadow(0 2px 6px rgba(245,158,11,0.3))' }} />
            <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em' }}>LEERAL</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
            {isLogin ? "Ravi de vous revoir ! Connectez-vous." : "Créez votre profil de budget personnel."}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Connexion
          </button>
          <button 
            type="button"
            className={`auth-tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, x: isLogin ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 10 : -10 }}
              transition={{ duration: 0.2 }}
            >
              {!isLogin && (
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

              <div className="form-group" style={{ marginBottom: isLogin ? 24 : 16 }}>
                <label>Mot de passe</label>
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
              </div>

              {!isLogin && (
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
                    style={{ marginBottom: 24 }}
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
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <motion.div 
              className="alert-banner"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <AlertTriangle size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          <button type="submit" className="btn-premium btn-premium-primary" disabled={loading}>
            {loading ? 'Traitement en cours...' : isLogin ? 'Se connecter' : "Valider mon inscription"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
