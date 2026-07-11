import { TrendingUp, Check } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import Counter from '../ui/Counter';

interface BudgetGlowCardProps {
  stats: any;
}

export default function BudgetGlowCard({ stats }: BudgetGlowCardProps) {
  if (!stats) return null;

  const totalDepenses = parseFloat(stats.total_depenses || 0);
  const budgetMensuel = parseFloat(stats.budget_mensuel || 0);
  
  const budgetRatio = budgetMensuel > 0 
    ? Math.min((totalDepenses / budgetMensuel) * 100, 100)
    : 0;

  const resteAVivre = Math.max(0, budgetMensuel - totalDepenses);
  const isOverrun = totalDepenses >= budgetMensuel;
  const isClose = budgetRatio >= 85 && !isOverrun;

  return (
    <GlassCard 
      className={`budget-card ${isOverrun ? 'overrun' : ''}`}
      hoverScale={false}
      style={{
        padding: 24,
        marginBottom: 20
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.85, fontWeight: 700 }}>
            Budget Consommé
          </span>
          <h2 style={{ fontSize: 36, fontWeight: 900, marginTop: 4, letterSpacing: '-0.04em' }}>
            <Counter value={totalDepenses} formatter={(v) => `${v.toLocaleString()} FCFA`} />
          </h2>
        </div>
        <div 
          style={{ 
            background: 'rgba(255, 255, 255, 0.15)', 
            padding: 10, 
            borderRadius: 14,
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <TrendingUp size={24} />
        </div>
      </div>

      <div className="budget-progress-container">
        <div className="progress-bar-track">
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${budgetRatio}%`, 
              background: isOverrun 
                ? '#ffffff' 
                : isClose 
                  ? 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)' 
                  : 'linear-gradient(90deg, #34d399 0%, #10b981 100%)'
            }} 
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, fontWeight: 600, opacity: 0.9 }}>
          <span>{budgetRatio.toFixed(0)}% consommé</span>
          <span>Limite : {budgetMensuel.toLocaleString()} FCFA</span>
        </div>
      </div>

      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          paddingTop: 16, 
          borderTop: '1px solid rgba(255, 255, 255, 0.12)', 
          marginTop: 16,
          fontSize: 13,
          fontWeight: 700
        }}
      >
        <span style={{ opacity: 0.85 }}>Reste à vivre :</span>
        <span style={{ fontSize: 15, background: 'rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: 8 }}>
          {resteAVivre.toLocaleString()} FCFA
        </span>
      </div>

      {stats.recompense_economie && (
        <div 
          style={{ 
            display: 'flex', 
            gap: 8, 
            alignItems: 'center', 
            background: 'rgba(16, 185, 129, 0.2)', 
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '8px 14px', 
            borderRadius: 12, 
            fontSize: 12, 
            marginTop: 16,
            fontWeight: 600,
            color: '#a7f3d0'
          }}
        >
          <Check size={16} />
          <span>{stats.recompense_economie}</span>
        </div>
      )}
    </GlassCard>
  );
}
