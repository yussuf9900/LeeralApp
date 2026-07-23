import { AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react';
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
      <GlassCard style={{ padding: 16, background: 'rgba(16, 185, 129, 0.04)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={20} color="#10b981" />
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Mes Conseils Sama Facture
          </h4>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
          Félicitations ! Aucune surconsommation ni fuite détectée. Continuez à suivre régulièrement votre consommation.
        </p>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={18} color="var(--color-primary)" />
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 0.3 }}>
          Mes Conseils & Recommandations
        </h3>
      </div>

      {recommendations.map((rec, index) => {
        const isWarning = rec.type_conseil === 'WARNING';
        const isGood = rec.type_conseil === 'GOOD_PRACTICE';

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
          <GlassCard
            key={rec.id || index}
            style={{
              padding: 14,
              background: bgColor,
              borderColor: borderColor,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start'
            }}
          >
            <div
              style={{
                padding: 8,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.2)',
                color: iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {isWarning && <AlertTriangle size={18} />}
              {isGood && <CheckCircle size={18} />}
              {!isWarning && !isGood && <Info size={18} />}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: iconColor }}>
                  {rec.titre}
                </h4>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: isWarning ? 'rgba(239, 68, 68, 0.15)' : isGood ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: iconColor
                  }}
                >
                  {rec.service}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                {rec.message}
              </p>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
