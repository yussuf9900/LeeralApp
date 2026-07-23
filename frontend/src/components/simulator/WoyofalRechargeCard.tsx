import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface WoyofalRechargeCardProps {
  onCalculate: (data: {
    montant: number;
    modePaiement: 'CASH' | 'DIGITAL';
    consoJournaliere: number;
  }) => void;
  onSaveRecharge: () => void;
  result: any;
  loading: boolean;
  successMsg: string;
}

export default function WoyofalRechargeCard({
  onCalculate,
  onSaveRecharge,
  result,
  loading,
  successMsg
}: WoyofalRechargeCardProps) {
  const [montant, setMontant] = useState<number>(5000);
  const [customMontant, setCustomMontant] = useState<string>('5000');
  const [modePaiement, setModePaiement] = useState<'DIGITAL' | 'CASH'>('DIGITAL');
  const [consoJournaliere, setConsoJournaliere] = useState<number>(5);

  const presetAmounts = [1000, 2000, 5000, 10000, 20000];

  const handleSelectPreset = (val: number) => {
    setMontant(val);
    setCustomMontant(val.toString());
    onCalculate({ montant: val, modePaiement, consoJournaliere });
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomMontant(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      setMontant(num);
      onCalculate({ montant: num, modePaiement, consoJournaliere });
    }
  };

  const handlePaiementChange = (mode: 'DIGITAL' | 'CASH') => {
    setModePaiement(mode);
    onCalculate({ montant, modePaiement: mode, consoJournaliere });
  };

  const handleConsoChange = (val: number) => {
    setConsoJournaliere(val);
    onCalculate({ montant, modePaiement, consoJournaliere: val });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <GlassCard style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ padding: 10, borderRadius: 12, background: 'rgba(234, 179, 8, 0.12)', color: '#eab308' }}>
            <Zap size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              Recharge Prépayée Senelec Woyofal
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Convertissez votre budget en kWh et calculez votre autonomie en jours
            </p>
          </div>
        </div>

        {/* Preset Amounts Pills */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
            CHOISISSEZ UN MONTANT DE RECHARGE (FCFA)
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {presetAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleSelectPreset(amt)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: montant === amt ? '#eab308' : 'var(--border-color)',
                  background: montant === amt ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.05)',
                  color: montant === amt ? '#eab308' : 'var(--text-primary)',
                  transition: 'all 0.2s'
                }}
              >
                {amt.toLocaleString()} F
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input & Mode Payment */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              MONTANT PERSONNALISÉ
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={customMontant}
                onChange={handleCustomChange}
                placeholder="ex: 5000"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 700
                }}
              />
              <span style={{ position: 'absolute', right: 10, top: 10, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                FCFA
              </span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              MODE DE PAIEMENT
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => handlePaiementChange('DIGITAL')}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: modePaiement === 'DIGITAL' ? '#10b981' : 'var(--border-color)',
                  background: modePaiement === 'DIGITAL' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: modePaiement === 'DIGITAL' ? '#10b981' : 'var(--text-primary)'
                }}
              >
                📱 Électronique
              </button>
              <button
                type="button"
                onClick={() => handlePaiementChange('CASH')}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: modePaiement === 'CASH' ? '#f59e0b' : 'var(--border-color)',
                  background: modePaiement === 'CASH' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  color: modePaiement === 'CASH' ? '#f59e0b' : 'var(--text-primary)'
                }}
              >
                💵 Espèces (+1%)
              </button>
            </div>
          </div>
        </div>

        {/* Daily Consumption Rate slider for Lifetime estimation */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Consommation quotidienne moyenne :
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#eab308' }}>
              {consoJournaliere} kWh / jour
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="25"
            step="1"
            value={consoJournaliere}
            onChange={(e) => handleConsoChange(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: '#eab308' }}
          />
        </div>
      </GlassCard>

      {/* Results Display */}
      {result && (
        <GlassCard style={{ padding: 20, background: 'rgba(234, 179, 8, 0.04)', borderColor: 'rgba(234, 179, 8, 0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: 16, borderRadius: 14, background: 'rgba(234, 179, 8, 0.1)' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#eab308', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                ÉNERGIE OBTENUE
              </span>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
                {result.consommation} <span style={{ fontSize: 16, fontWeight: 600 }}>kWh</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: 16, borderRadius: 14, background: 'rgba(16, 185, 129, 0.1)' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                AUTONOMIE ESTIMÉE
              </span>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
                ~{result.duree_estimee_jours || Math.round(result.consommation / consoJournaliere)} <span style={{ fontSize: 16, fontWeight: 600 }}>Jours</span>
              </div>
            </div>
          </div>

          {/* Tranche 1 Monthly Progress Bar */}
          {result.kwh_cumules_mois_apres !== undefined && (
            <div style={{ marginBottom: 16, background: 'rgba(255, 255, 255, 0.04)', padding: 12, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cumul mensuel Woyofal :</span>
                <span style={{ color: result.kwh_cumules_mois_apres > 150 ? '#ef4444' : '#10b981' }}>
                  {result.kwh_cumules_mois_apres.toFixed(1)} / 150 kWh (Tranche 1 à 82 FCFA/kWh)
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (result.kwh_cumules_mois_apres / 150) * 100)}%`,
                    background: result.kwh_cumules_mois_apres > 150 ? 'linear-gradient(90deg, #10b981, #ef4444)' : '#10b981',
                    borderRadius: 4,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* Financial Breakdown Table */}
          <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Montant Payé TTC :</span>
              <strong style={{ color: 'var(--text-primary)' }}>{result.montant_ttc?.toLocaleString()} FCFA</strong>
            </div>

            {result.is_first_recharge && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                <span>Redevance fixe mensuelle (1er achat) :</span>
                <strong>- {result.redevance?.toLocaleString()} FCFA</strong>
              </div>
            )}

            {!result.is_first_recharge && result.redevance === 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                <span>Redevance fixe mensuelle :</span>
                <strong>0 FCFA (Déjà payée ce mois)</strong>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxe Communale (2.5%) :</span>
              <span>{result.taxe_communale?.toLocaleString()} FCFA</span>
            </div>

            {result.droit_de_timbre > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                <span>Droit de timbre (Espèces 1%) :</span>
                <span>{result.droit_de_timbre?.toLocaleString()} FCFA</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 6, fontWeight: 700, color: 'var(--text-primary)' }}>
              <span>Répartition Tranches :</span>
              <span>
                {result.kwh_t1 > 0 && `${result.kwh_t1} kWh (T1)`}
                {result.kwh_t2 > 0 && ` + ${result.kwh_t2} kWh (T2)`}
              </span>
            </div>
          </div>

          {/* Confirm & Save Button */}
          <button
            type="button"
            onClick={onSaveRecharge}
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #eab308, #ca8a04)',
              color: '#000',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(234, 179, 8, 0.3)'
            }}
          >
            {loading ? 'Enregistrement...' : '⚡ Effectuer & Enregistrer cette recharge'}
          </button>

          {successMsg && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#10b981', textAlign: 'center', fontWeight: 700 }}>
              ✅ {successMsg}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
