import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import Counter from '../ui/Counter';

interface CostDetailsProps {
  result: any;
  service: 'SENELEC' | 'SENEAU';
  onSave: () => void;
  saving: boolean;
  successMsg: string;
  budgetOverrunWarning?: string;
}

export default function CostDetails({
  result,
  service,
  onSave,
  saving,
  successMsg,
  budgetOverrunWarning
}: CostDetailsProps) {
  if (!result) return null;

  const isSenelec = service === 'SENELEC';

  return (
    <motion.div 
      className="glass-card"
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginTop: 20 }}
    >
      {/* Gross consumption & period header */}
      <div style={{ textAlign: 'center', borderBottom: '1.5px solid var(--border-color)', paddingBottom: 16, marginBottom: 18 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: 0.5 }}>
          Consommation Relevée
        </span>
        <h3 
          style={{ 
            fontSize: 28, 
            fontWeight: 900, 
            marginTop: 4,
            color: isSenelec ? 'var(--color-senelec)' : 'var(--color-seneau)',
            letterSpacing: '-0.04em'
          }}
        >
          {result.consommation} {isSenelec ? 'kWh' : 'm³'}
        </h3>
        {isSenelec && result.nombre_jours && (
          <div style={{ 
            marginTop: 8, 
            fontSize: 12, 
            fontWeight: 700, 
            color: 'var(--color-senelec)', 
            background: 'rgba(234, 179, 8, 0.1)', 
            padding: '4px 12px', 
            borderRadius: 20, 
            display: 'inline-block' 
          }}>
            Période : {result.nombre_jours} jours {result.nombre_jours === 60 ? '(Bimestre Senelec)' : ''}
          </div>
        )}
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>
        Répartition par tranches progressives {result.nombre_jours ? `(${result.nombre_jours} j)` : ''}
      </h4>
      
      <div className="tranches-breakdown">
        {isSenelec ? (
          <>
            <div className="tranche-row">
              <span className="tranche-badge t1" />
              <div className="tranche-details">
                <span>Tranche 1 (0-{result.limite_t1 ?? 150} kWh)</span>
                <span>{result.montant_t1.toLocaleString()} F</span>
              </div>
            </div>
            <div className="tranche-row">
              <span className="tranche-badge t2" />
              <div className="tranche-details">
                <span>Tranche 2 ({result.limite_t1 ?? 150}-{result.limite_t2 ?? 250} kWh)</span>
                <span>{result.montant_t2.toLocaleString()} F</span>
              </div>
            </div>
            <div className="tranche-row">
              <span className="tranche-badge t3" />
              <div className="tranche-details">
                <span>Tranche 3 (&gt;{result.limite_t2 ?? 250} kWh)</span>
                <span>{result.montant_t3.toLocaleString()} F</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="tranche-row">
              <span className="tranche-badge t1" />
              <div className="tranche-details">
                <span>Tranche Sociale (0-20 m³)</span>
                <span>{result.montant_social.toLocaleString()} F</span>
              </div>
            </div>
            <div className="tranche-row">
              <span className="tranche-badge t2" />
              <div className="tranche-details">
                <span>Tranche Pleine (20-40 m³)</span>
                <span>{result.montant_pleine.toLocaleString()} F</span>
              </div>
            </div>
            <div className="tranche-row">
              <span className="tranche-badge t3" />
              <div className="tranche-details">
                <span>Tranche Dissuasive (&gt;40 m³)</span>
                <span>{result.montant_dissuasive.toLocaleString()} F</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Financial Details */}
      <div 
        style={{ 
          marginTop: 20, 
          paddingTop: 16, 
          borderTop: '1.5px dashed var(--border-color)', 
          fontSize: 13, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 8,
          fontWeight: 600,
          color: 'var(--text-secondary)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Hors Taxe (HT)</span>
          <span style={{ color: 'var(--text-primary)' }}>{result.montant_ht.toLocaleString()} F</span>
        </div>
        
        {isSenelec && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>TVA (18% &gt; {result.seuil_tva ?? 250} kWh)</span>
            <span style={{ color: 'var(--text-primary)' }}>{result.tva.toLocaleString()} F</span>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Redevance / Frais Fixes ({result.nombre_jours ?? 30} j)</span>
          <span style={{ color: 'var(--text-primary)' }}>{result.redevance.toLocaleString()} F</span>
        </div>
        
        {isSenelec && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Taxe Communale (2.5% HT)</span>
            <span style={{ color: 'var(--text-primary)' }}>{result.taxe_communale.toLocaleString()} F</span>
          </div>
        )}
        
        {result.droit_de_timbre > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Droit de timbre (1% timbre)</span>
            <span style={{ color: 'var(--text-primary)' }}>{result.droit_de_timbre.toLocaleString()} F</span>
          </div>
        )}

        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: 18, 
            fontWeight: 900, 
            color: 'var(--text-primary)',
            marginTop: 10, 
            paddingTop: 14, 
            borderTop: '1.5px solid var(--border-color)' 
          }}
        >
          <span>Montant Total TTC</span>
          <span style={{ color: 'var(--color-primary)' }}>
            <Counter value={result.montant_ttc} formatter={(v) => `${v.toLocaleString()} FCFA`} />
          </span>
        </div>
      </div>

      {budgetOverrunWarning && (
        <motion.div 
          style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: 'var(--color-danger)', 
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: 12, 
            borderRadius: 14, 
            textAlign: 'center', 
            fontSize: 12, 
            fontWeight: 700, 
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <AlertTriangle size={14} /> {budgetOverrunWarning}
        </motion.div>
      )}

      {successMsg ? (
        <motion.div 
          style={{ 
            background: 'var(--color-success-light)', 
            color: 'var(--color-success)', 
            padding: 12, 
            borderRadius: 14, 
            textAlign: 'center', 
            fontSize: 13, 
            fontWeight: 700, 
            marginTop: 20 
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {successMsg}
        </motion.div>
      ) : (
        <button 
          className="btn-premium btn-premium-secondary" 
          onClick={onSave} 
          disabled={saving}
          style={{ marginTop: 20, width: '100%' }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer dans mon Budget'}
        </button>
      )}
    </motion.div>
  );
}
