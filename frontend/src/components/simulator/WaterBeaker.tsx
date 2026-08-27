

interface WaterBeakerProps {
  consumption: number;
  limiteSociale?: number;
  limitePleine?: number;
}

export default function WaterBeaker({ 
  consumption,
  limiteSociale = 20,
  limitePleine = 40
}: WaterBeakerProps) {
  // Max capacity to display in beaker (dynamically scaled or default 50 m3)
  const maxCapacity = Math.max(50, limitePleine * 1.25);
  const heightPercent = Math.min((consumption / maxCapacity) * 100, 100);

  // Determine color/message based on dynamic tranches
  let statusText = `Tranche Sociale (0-${limiteSociale} m³)`;
  let statusColor = '#0ea5e9'; // Light blue

  if (consumption > limitePleine) {
    statusText = `Tranche Dissuasive (>${limitePleine} m³)`;
    statusColor = '#ef4444'; // Red
  } else if (consumption > limiteSociale) {
    statusText = `Tranche Pleine (${limiteSociale}-${limitePleine} m³)`;
    statusColor = '#3b82f6'; // Medium blue
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '24px 0' }}>
      <div className="water-beaker">
        {/* Animated wave layer */}
        <div 
          className="water-wave-layer" 
          style={{ 
            height: `${heightPercent}%`,
            background: consumption > 40 
              ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.7) 0%, rgba(220, 38, 38, 0.9) 100%)'
              : 'linear-gradient(180deg, rgba(14, 165, 233, 0.8) 0%, rgba(37, 99, 235, 0.95) 100%)'
          }} 
        />
        
        {/* Floating text values */}
        <div className="water-beaker-overlay">
          <span className="water-beaker-label">Consommation</span>
          <span className="water-beaker-value">{consumption} m³</span>
        </div>
      </div>
      
      <div style={{ marginTop: 12, color: statusColor, fontWeight: 700, fontSize: 13 }}>
        {statusText}
      </div>
    </div>
  );
}
