import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Sparkles, Zap, Droplet } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

export interface RecommendationItem {
  id?: string;
  service: 'SENELEC' | 'SENEAU';
  code_regle: string;
  titre: string;
  message: string;
  type_conseil: 'GOOD_PRACTICE' | 'WARNING' | 'INFO';
  cree_a?: string;
}

interface RecommendationsWidgetProps {
  recommendations: RecommendationItem[];
}

export default function RecommendationsWidget({ recommendations }: RecommendationsWidgetProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <GlassCard 
        style={{ 
          padding: 20, 
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(59, 130, 246, 0.04) 100%)', 
          borderColor: 'rgba(16, 185, 129, 0.2)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 10, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              Sama Facture : Conseils & Économies
            </h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
              Félicitations ! Aucune surconsommation ni fuite d'eau n'a été détectée. Continuez à suivre votre consommation avec Leeral.
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 8, borderRadius: 10, background: 'rgba(79, 70, 229, 0.12)', color: 'var(--color-primary)' }}>
            <Sparkles size={18} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Mes Conseils & Optimisations
          </h3>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)' }}>
          {recommendations.length} conseil{recommendations.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recommendations.map((rec, index) => {
          const isWarning = rec.type_conseil === 'WARNING';
          const isGood = rec.type_conseil === 'GOOD_PRACTICE';
          const isSenelec = rec.service === 'SENELEC';

          const bgColor = isWarning 
            ? 'rgba(239, 68, 68, 0.06)' 
            : isGood 
            ? 'rgba(16, 185, 129, 0.06)' 
            : 'rgba(59, 130, 246, 0.06)';

          const borderColor = isWarning 
            ? 'rgba(239, 68, 68, 0.25)' 
            : isGood 
            ? 'rgba(16, 185, 129, 0.25)' 
            : 'rgba(59, 130, 246, 0.25)';

          const iconColor = isWarning ? '#ef4444' : isGood ? '#10b981' : '#3b82f6';

          return (
            <motion.div
              key={rec.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
            >
              <GlassCard
                style={{
                  padding: 16,
                  background: bgColor,
                  borderColor: borderColor,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
                }}
              >
                {/* Icon Container */}
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.25)',
                    color: iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}
                >
                  {isWarning && <AlertTriangle size={20} />}
                  {isGood && <CheckCircle size={20} />}
                  {!isWarning && !isGood && <Info size={20} />}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: iconColor }}>
                      {rec.titre}
                    </h4>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: 12,
                        background: isSenelec ? 'rgba(245, 158, 11, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                        color: isSenelec ? '#f59e0b' : '#0ea5e9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {isSenelec ? <Zap size={10} /> : <Droplet size={10} />}
                      {rec.service}
                    </span>
                  </div>

                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {rec.message}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
