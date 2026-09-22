import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings } from 'lucide-react';

interface CookieConsentBannerProps {
  onOpenLegalModal: (tab: 'mentions' | 'confidentialite' | 'cgu' | 'cookies') => void;
}

export default function CookieConsentBanner({ onOpenLegalModal }: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('leeral_cookie_consent');
    if (!consent) {
      // Afficher après un léger délai pour une expérience utilisateur fluide
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('leeral_cookie_consent', JSON.stringify({
      essential: true,
      analytics: true,
      timestamp: new Date().toISOString()
    }));
    setIsVisible(false);
  };

  const handleRefuseAll = () => {
    localStorage.setItem('leeral_cookie_consent', JSON.stringify({
      essential: true,
      analytics: false,
      timestamp: new Date().toISOString()
    }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="cookie-banner-container"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          right: 24,
          maxWidth: 680,
          margin: '0 auto',
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-color)',
          borderRadius: 20,
          padding: '20px 24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.1)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
            flexShrink: 0
          }}>
            <Cookie size={20} />
          </div>

          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 800 }}>
              Respect de votre vie privée • CDP Sénégal
            </h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Leeral utilise des témoins strictement nécessaires au fonctionnement de l'application (authentification sécurisée et sessions). Avec votre accord, nous utilisons des mesures d'audience anonymes pour optimiser l'expérience. Conforme à la <strong>Loi n° 2008-12</strong>.
            </p>
            <div style={{ marginTop: 6 }}>
              <button
                type="button"
                onClick={() => onOpenLegalModal('cookies')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                En savoir plus sur notre politique de cookies
              </button>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={() => onOpenLegalModal('cookies')}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Settings size={14} />
            <span>Paramétrer</span>
          </button>

          <button
            type="button"
            onClick={handleRefuseAll}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 10,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Continuer sans accepter
          </button>

          <button
            type="button"
            onClick={handleAcceptAll}
            className="btn-premium btn-premium-primary"
            style={{
              padding: '8px 18px',
              fontSize: 12,
              margin: 0
            }}
          >
            Tout accepter
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
