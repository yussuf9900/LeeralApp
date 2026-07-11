
import { Lightbulb } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface SavingsTipProps {
  stats: any;
}

export default function SavingsTip({ stats }: SavingsTipProps) {
  const hasExpenses = stats && stats.total_depenses > 0;

  const tipText = hasExpenses
    ? "Pour l'électricité, essayez de rester en dessous de 150 kWh/mois pour bénéficier du tarif social T1 SENELEC avec une baisse de 10% sur le tarif normal."
    : "Enregistrez vos index de compteurs d'eau et d'électricité dans l'onglet Simulateur pour commencer à suivre votre budget en temps réel !";

  return (
    <GlassCard 
      style={{ 
        background: 'rgba(79, 70, 229, 0.04)', 
        borderColor: 'rgba(79, 70, 229, 0.15)',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: 16
      }}
      hoverScale={false}
    >
      <div 
        style={{ 
          background: 'rgba(79, 70, 229, 0.08)',
          color: 'var(--color-primary)',
          padding: 8,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Lightbulb size={20} />
      </div>
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Astuce Éco Leeral
        </h4>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5, fontWeight: 500 }}>
          {tipText}
        </p>
      </div>
    </GlassCard>
  );
}
