
import { Minus, Plus } from 'lucide-react';

interface IndexInputCardProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  service: 'SENELEC' | 'SENEAU';
}

export default function IndexInputCard({
  label,
  value,
  onChange,
  service
}: IndexInputCardProps) {
  const isSenelec = service === 'SENELEC';

  const handleIncrement = () => onChange(value + 1);
  const handleDecrement = () => onChange(Math.max(0, value - 1));

  return (
    <div className={`giant-index-card ${isSenelec ? 'senelec-active' : 'active'}`}>
      <h4>{label}</h4>
      
      <input
        type="number"
        className="giant-index-value"
        value={value === 0 ? '' : value}
        placeholder="0"
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          onChange(isNaN(val) ? 0 : Math.max(0, val));
        }}
      />

      <div className="giant-index-controls">
        <button 
          type="button" 
          className="btn-dial" 
          onClick={handleDecrement}
          style={{ 
            color: isSenelec ? 'var(--color-senelec)' : 'var(--color-seneau)',
            borderColor: isSenelec ? 'rgba(245, 158, 11, 0.2)' : 'rgba(2, 132, 199, 0.2)'
          }}
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>
        <button 
          type="button" 
          className="btn-dial" 
          onClick={handleIncrement}
          style={{ 
            color: isSenelec ? 'var(--color-senelec)' : 'var(--color-seneau)',
            borderColor: isSenelec ? 'rgba(245, 158, 11, 0.2)' : 'rgba(2, 132, 199, 0.2)'
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
