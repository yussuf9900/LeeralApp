import { motion } from 'framer-motion';
import { Zap, Calculator, LayoutDashboard, Gauge, ChevronRight } from 'lucide-react';

interface OnboardingProps {
  onStart: () => void;
}

export default function Onboarding({ onStart }: OnboardingProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  } as const;

  const itemVariants = {
    hidden: { y: 25, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 200, damping: 20 }
    }
  } as const;

  return (
    <div className="intro-container">
      <motion.div 
        className="intro-card"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div 
          className="logo-glow"
          initial={{ rotate: -90, scale: 0.5 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 150, delay: 0.1 }}
        >
          <Zap size={36} fill="white" />
        </motion.div>

        <motion.h1 
          style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.04em' }}
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Bienvenue sur <span style={{ color: 'var(--color-primary)' }}>Leeral</span>
        </motion.h1>
        
        <motion.p 
          style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '0 12px', lineHeight: 1.6, fontWeight: 500 }}
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          Maîtrisez votre budget et estimez vos factures d'eau et d'électricité au Sénégal avec une précision chirurgicale.
        </motion.p>

        <motion.div 
          className="feature-list"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="feature-card" variants={itemVariants}>
            <div className="icon-wrapper" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
              <Calculator size={20} />
            </div>
            <div>
              <h3>Simulateur temps réel</h3>
              <p>Calculez vos coûts Senelec (Woyofal/Facture avec baisse de 10%) et Sen'Eau selon vos index réels.</p>
            </div>
          </motion.div>

          <motion.div className="feature-card" variants={itemVariants}>
            <div className="icon-wrapper" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h3>Contrôle du budget</h3>
              <p>Fixez votre limite mensuelle et recevez des alertes néon intelligentes pour éviter tout dépassement.</p>
            </div>
          </motion.div>

          <motion.div className="feature-card" variants={itemVariants}>
            <div className="icon-wrapper" style={{ color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.05)' }}>
              <Gauge size={20} />
            </div>
            <div>
              <h3>Gestion de compteurs</h3>
              <p>Enregistrez vos compteurs physiques pour garder l'historique et lancer des simulations en 1 clic.</p>
            </div>
          </motion.div>
        </motion.div>

        <motion.button 
          className="btn-premium btn-premium-primary"
          onClick={onStart}
          style={{ width: '100%' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Commencer l'expérience
          <ChevronRight size={18} />
        </motion.button>
      </motion.div>
    </div>
  );
}
