import React, { useState } from 'react';
import { Gauge, Zap, Plus } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface MeterFormProps {
  onSubmit: (data: any) => Promise<void>;
  msg: string;
}

export default function MeterForm({ onSubmit, msg }: MeterFormProps) {
  const [nom, setNom] = useState('');
  const [numero, setNumero] = useState('');
  const [service, setService] = useState<'SENELEC' | 'SENEAU'>('SENELEC');
  const [dernierIndex, setDernierIndex] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      nom,
      numero_compteur: numero,
      service,
      dernier_index: dernierIndex
    });
    setNom('');
    setNumero('');
    setDernierIndex(0);
  };

  return (
    <GlassCard style={{ padding: 20, marginBottom: 24 }} hoverScale={false}>
      <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Enregistrer un Compteur</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nom du compteur</label>
          <div className="input-wrapper">
            <Gauge size={18} />
            <input 
              type="text" 
              placeholder="Maison Principale, Cuisine, Bureau..." 
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Numéro de compteur</label>
          <div className="input-wrapper">
            <Gauge size={18} />
            <input 
              type="text" 
              placeholder="N° 21890372 ou ID Woyofal" 
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Service associé</label>
          <div className="input-wrapper">
            <Zap size={18} />
            <select 
              value={service}
              onChange={(e) => setService(e.target.value as any)}
            >
              <option value="SENELEC">SENELEC (Électricité)</option>
              <option value="SENEAU">SEN'EAU (Eau)</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>Dernier Index Relevé</label>
          <div className="input-wrapper">
            <Gauge size={18} />
            <input 
              type="number" 
              value={dernierIndex === 0 ? '' : dernierIndex}
              placeholder="0"
              onChange={(e) => setDernierIndex(Math.max(0, parseInt(e.target.value) || 0))}
              required
            />
          </div>
        </div>

        {msg && (
          <div 
            style={{ 
              padding: 10, 
              background: 'var(--color-primary-light)', 
              borderRadius: 12, 
              fontSize: 12, 
              color: 'var(--color-primary)', 
              marginBottom: 16,
              fontWeight: 700
            }}
          >
            {msg}
          </div>
        )}

        <button type="submit" className="btn-premium btn-premium-primary">
          <Plus size={16} strokeWidth={2.5} />
          Ajouter le compteur
        </button>
      </form>
    </GlassCard>
  );
}
