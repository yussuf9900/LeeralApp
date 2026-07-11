
import { Zap, Droplet } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface ServiceCardProps {
  service: 'SENELEC' | 'SENEAU';
  value: number; // consumption (kWh or m³)
  cost: number;  // spendings (FCFA)
}

export default function ServiceCard({ service, value, cost }: ServiceCardProps) {
  const isSenelec = service === 'SENELEC';

  return (
    <GlassCard 
      className={`service-card ${isSenelec ? 'senelec' : 'seneau'}`}
      style={{ minHeight: 130, padding: 18 }}
    >
      <div className="service-header">
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            color: isSenelec ? 'var(--color-senelec)' : 'var(--color-seneau)',
            fontWeight: 800,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.5
          }}
        >
          {isSenelec ? (
            <Zap size={16} fill="var(--color-senelec)" />
          ) : (
            <Droplet size={16} fill="var(--color-seneau)" />
          )}
          <span>{isSenelec ? 'Électricité' : 'Eau'}</span>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em' }}>
          {value.toLocaleString()} {isSenelec ? 'kWh' : 'm³'}
        </h3>
        <span 
          style={{ 
            fontSize: 12, 
            color: 'var(--text-secondary)', 
            fontWeight: 600,
            marginTop: 4,
            display: 'block' 
          }}
        >
          Dépense : <strong style={{ color: 'var(--text-primary)' }}>{cost.toLocaleString()} F</strong>
        </span>
      </div>
    </GlassCard>
  );
}
