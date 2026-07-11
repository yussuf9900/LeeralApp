
import { Zap, Droplet, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface MeterCardProps {
  meter: any;
  onSimulate: (meter: any) => void;
  onDelete: (id: string) => void;
}

export default function MeterCard({
  meter,
  onSimulate,
  onDelete
}: MeterCardProps) {
  const isSenelec = meter.service === 'SENELEC';

  return (
    <motion.div 
      className={`meter-card ${isSenelec ? 'senelec' : 'seneau'}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, boxShadow: '0 16px 36px rgba(0, 0, 0, 0.25)' }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <div className="meter-card-glow" />
      
      {/* Upper section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{meter.nom}</h3>
          <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>N° : {meter.numero_compteur}</span>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: 8, borderRadius: 12 }}>
          {isSenelec ? (
            <Zap size={20} fill="#ffffff" color="#ffffff" />
          ) : (
            <Droplet size={20} fill="#ffffff" color="#ffffff" />
          )}
        </div>
      </div>

      {/* Index middle section */}
      <div style={{ margin: '14px 0' }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.8, letterSpacing: 0.5, fontWeight: 700 }}>
          Dernier Index Relevé
        </span>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2, letterSpacing: '-0.02em' }}>
          {parseFloat(meter.dernier_index)} {isSenelec ? 'kWh' : 'm³'}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <button 
          onClick={() => onSimulate(meter)}
          style={{ 
            border: 'none', 
            background: '#ffffff', 
            color: isSenelec ? '#d97706' : '#2563eb', 
            padding: '8px 18px', 
            borderRadius: 12, 
            fontSize: 12, 
            fontWeight: 800, 
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Simuler
        </button>
        <button 
          onClick={() => onDelete(meter.id)}
          style={{ 
            border: 'none', 
            background: 'rgba(255, 255, 255, 0.18)', 
            color: '#ffffff', 
            padding: 8, 
            borderRadius: 10, 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.28)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)')}
          title="Supprimer ce compteur"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}
