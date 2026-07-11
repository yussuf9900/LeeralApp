
import { Zap } from 'lucide-react';

interface BatteryGaugeProps {
  consumption: number;
}

export default function BatteryGauge({ consumption }: BatteryGaugeProps) {
  // Max capacity to display in battery (e.g. 400 kWh)
  const maxCapacity = 400;
  const percentage = Math.min((consumption / maxCapacity) * 100, 100);

  // Determine color based on tranches: T1 (0-150), T2 (150-250), T3 (>250)
  let fillColor = '#10b981'; // Green
  let statusText = 'Tranche 1 : Économe (Tarif Social)';
  let glowColor = 'rgba(16, 185, 129, 0.4)';

  if (consumption > 250) {
    fillColor = '#ef4444'; // Red
    statusText = 'Tranche 3 : Dépassement critique';
    glowColor = 'rgba(239, 68, 68, 0.4)';
  } else if (consumption > 150) {
    fillColor = '#f59e0b'; // Amber
    statusText = 'Tranche 2 : Consommation moyenne';
    glowColor = 'rgba(245, 158, 11, 0.4)';
  }

  return (
    <div className="battery-gauge-container">
      <div className="battery-case" style={{ borderColor: 'var(--border-color)' }}>
        <div 
          className="battery-fill" 
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: fillColor,
            boxShadow: `0 0 16px ${glowColor}`
          }} 
        />
        <div className="battery-tip" style={{ backgroundColor: 'var(--border-color)' }} />
        
        <div className="battery-overlay">
          <Zap 
            size={18} 
            fill={consumption > 0 ? '#ffffff' : 'none'} 
            color={consumption > 0 ? '#ffffff' : 'var(--text-secondary)'} 
            style={{ marginRight: 6 }} 
          />
          <span>{consumption} kWh</span>
        </div>
      </div>
      
      <div className="battery-info-text" style={{ color: fillColor, fontWeight: 700 }}>
        {statusText}
      </div>
    </div>
  );
}
