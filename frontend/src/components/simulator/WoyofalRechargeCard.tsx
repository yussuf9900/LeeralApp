import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Calendar, 
  Smartphone, 
  Banknote, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface WoyofalRechargeCardProps {
  onCalculate: (data: {
    montant: number;
    modePaiement: 'CASH' | 'DIGITAL';
    consoJournaliere: number;
    dateAchat: string;
  }) => void;
  onSaveRecharge: (data: {
    montant: number;
    modePaiement: 'CASH' | 'DIGITAL';
    consoJournaliere: number;
    dateAchat: string;
  }) => void;
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
  const [dateAchat, setDateAchat] = useState<string>(new Date().toISOString().split('T')[0]);

  const presetAmounts = [
    { value: 1000, label: '1 000 F' },
    { value: 2000, label: '2 000 F' },
    { value: 5000, label: '5 000 F', popular: true },
    { value: 10000, label: '10 000 F' },
    { value: 20000, label: '20 000 F' }
  ];

  const handleSelectPreset = (val: number) => {
    setMontant(val);
    setCustomMontant(val.toString());
    onCalculate({ montant: val, modePaiement, consoJournaliere, dateAchat });
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomMontant(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      setMontant(num);
      onCalculate({ montant: num, modePaiement, consoJournaliere, dateAchat });
    }
  };

  const handlePaiementChange = (mode: 'DIGITAL' | 'CASH') => {
    setModePaiement(mode);
    onCalculate({ montant, modePaiement: mode, consoJournaliere, dateAchat });
  };

  const handleConsoChange = (val: number) => {
    setConsoJournaliere(val);
    onCalculate({ montant, modePaiement, consoJournaliere: val, dateAchat });
  };

  const handleDateChange = (val: string) => {
    setDateAchat(val);
    onCalculate({ montant, modePaiement, consoJournaliere, dateAchat: val });
  };

  // Helper calculation for progress percentage (150 kWh threshold)
  const kwhCumules = result?.kwh_cumules_mois_apres || 0;
  const progressPercent = Math.min(100, (kwhCumules / 150) * 100);
  const isOverTranche1 = kwhCumules > 150;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Primary Woyofal Simulator Input Card */}
      <GlassCard style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
        {/* Subtle Background Glow Accent */}
        <div 
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0) 70%)',
            pointerEvents: 'none'
          }} 
        />

        {/* Card Title & Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div 
            style={{ 
              padding: 12, 
              borderRadius: 14, 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.15))', 
              color: '#f59e0b',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Zap size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Recharge Prépayée Senelec Woyofal
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              Convertissez votre budget FCFA en kWh et estimez votre autonomie en jours
            </p>
          </div>
        </div>

        {/* Date d'achat & Reset Badge */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <Calendar size={14} color="#f59e0b" /> Date d'achat de la recharge
            </label>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> Reset le 1er du mois
            </span>
          </div>
          <input
            type="date"
            value={dateAchat}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1.5px solid var(--border-color)',
              background: 'var(--bg-input, rgba(15, 23, 42, 0.03))',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Preset Amount Pills */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Choisissez un montant courant (FCFA)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(85px, 1fr))', gap: 8 }}>
            {presetAmounts.map((preset) => {
              const isSelected = montant === preset.value;
              return (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  key={preset.value}
                  type="button"
                  onClick={() => handleSelectPreset(preset.value)}
                  style={{
                    position: 'relative',
                    padding: '10px 8px',
                    borderRadius: 14,
                    fontSize: 13,
                    fontWeight: 800,
                    border: isSelected ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#f59e0b' : 'var(--text-primary)',
                    boxShadow: isSelected ? '0 4px 14px rgba(245, 158, 11, 0.25)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {preset.popular && (
                    <span 
                      style={{ 
                        position: 'absolute', 
                        top: -8, 
                        right: -4, 
                        fontSize: 9, 
                        fontWeight: 900, 
                        padding: '2px 6px', 
                        borderRadius: 10, 
                        background: '#f59e0b', 
                        color: '#000',
                        boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)'
                      }}
                    >
                      TOP
                    </span>
                  )}
                  {preset.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Custom Amount Input & Payment Mode Toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Montant Personnalisé
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={customMontant}
                onChange={handleCustomChange}
                placeholder="ex: 5000"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  paddingRight: 55,
                  borderRadius: 12,
                  border: '1.5px solid var(--border-color)',
                  background: 'var(--bg-input, rgba(15, 23, 42, 0.03))',
                  color: 'var(--text-primary)',
                  fontSize: 15,
                  fontWeight: 800
                }}
              />
              <span style={{ position: 'absolute', right: 12, top: 13, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 800 }}>
                FCFA
              </span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Mode de paiement
            </label>
            <div style={{ display: 'flex', gap: 6, background: 'rgba(0, 0, 0, 0.04)', padding: 4, borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => handlePaiementChange('DIGITAL')}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: modePaiement === 'DIGITAL' ? '#10b981' : 'transparent',
                  color: modePaiement === 'DIGITAL' ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: modePaiement === 'DIGITAL' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  transition: 'all 0.2s ease'
                }}
              >
                <Smartphone size={14} /> Wave/OM
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => handlePaiementChange('CASH')}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: modePaiement === 'CASH' ? '#f59e0b' : 'transparent',
                  color: modePaiement === 'CASH' ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: modePaiement === 'CASH' ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  transition: 'all 0.2s ease'
                }}
              >
                <Banknote size={14} /> Espèces (+1%)
              </motion.button>
            </div>
          </div>
        </div>

        {/* Daily Consumption Rate Slider */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 16, borderRadius: 14, border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚡ Consommation journalière estimée :
            </span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 10px', borderRadius: 12 }}>
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
            style={{
              width: '100%',
              accentColor: '#f59e0b',
              cursor: 'pointer',
              height: 6,
              borderRadius: 3
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 600 }}>
            <span>1 kWh (Éco)</span>
            <span>10 kWh (Moyen)</span>
            <span>25 kWh (Intensif)</span>
          </div>
        </div>
      </GlassCard>

      {/* Dynamic Results Card */}
      {result && (
        <GlassCard 
          style={{ 
            padding: 24, 
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)', 
            borderColor: 'rgba(245, 158, 11, 0.25)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Key Autonomy & kWh Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{ 
                textAlign: 'center', 
                padding: 18, 
                borderRadius: 16, 
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)'
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                ÉNERGIE OBTENUE
              </span>
              <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
                {result.consommation} <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>kWh</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              style={{ 
                textAlign: 'center', 
                padding: 18, 
                borderRadius: 16, 
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                AUTONOMIE ESTIMÉE
              </span>
              <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
                ~{result.duree_estimee_jours || Math.round(result.consommation / consoJournaliere)} <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>Jours</span>
              </div>
            </motion.div>
          </div>

          {/* Monthly Tranche 1 (150 kWh) Progress Bar & Threshold Indicator */}
          {result.kwh_cumules_mois_apres !== undefined && (
            <div style={{ marginBottom: 20, background: 'rgba(255, 255, 255, 0.05)', padding: 16, borderRadius: 16, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color="#f59e0b" /> Cumul Mensuel Woyofal (Tranche 1)
                </span>
                <span style={{ color: isOverTranche1 ? '#ef4444' : '#10b981', padding: '2px 8px', borderRadius: 10, background: isOverTranche1 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)' }}>
                  {result.kwh_cumules_mois_apres.toFixed(1)} / 150 kWh
                </span>
              </div>

              {/* Progress track */}
              <div style={{ width: '100%', height: 10, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: isOverTranche1 
                      ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 60%, #ef4444 100%)' 
                      : 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                    borderRadius: 5
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6, color: 'var(--text-secondary)' }}>
                <span>Tranche 1 (Économique @ 82.56 F/kWh)</span>
                {isOverTranche1 ? (
                  <strong style={{ color: '#ef4444' }}>⚠️ Passage en Tranche 2 (+ cher)</strong>
                ) : (
                  <span style={{ color: '#10b981' }}>{(150 - result.kwh_cumules_mois_apres).toFixed(1)} kWh restants à prix réduit</span>
                )}
              </div>
            </div>
          )}

          {/* Financial Breakdown Table */}
          <div style={{ background: 'rgba(0, 0, 0, 0.03)', padding: 14, borderRadius: 14, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Montant Payé TTC :</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: 15 }}>{result.montant_ttc?.toLocaleString()} FCFA</strong>
            </div>

            {result.is_first_recharge ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> Redevance fixe (1er achat du mois) :
                </span>
                <strong>- {result.redevance?.toLocaleString()} FCFA</strong>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={12} /> Redevance fixe mensuelle :
                </span>
                <strong>0 FCFA (Déjà réglée ce mois)</strong>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>Taxe Communale (2.5%) :</span>
              <span>{result.taxe_communale?.toLocaleString()} FCFA</span>
            </div>

            {result.droit_de_timbre > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', fontSize: 12 }}>
                <span>Droit de Timbre (Espèces 1%) :</span>
                <span>{result.droit_de_timbre?.toLocaleString()} FCFA</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 8, fontWeight: 800, color: 'var(--text-primary)' }}>
              <span>Répartition Tranches Énergie :</span>
              <span style={{ color: '#f59e0b' }}>
                {result.kwh_t1 > 0 && `${result.kwh_t1} kWh (T1)`}
                {result.kwh_t2 > 0 && ` + ${result.kwh_t2} kWh (T2)`}
              </span>
            </div>
          </div>

          {/* Confirm & Save Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => onSaveRecharge({ montant, modePaiement, consoJournaliere, dateAchat })}
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 18,
              padding: '14px 20px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {loading ? (
              <span>Enregistrement en cours...</span>
            ) : (
              <>
                <Zap size={18} /> Enregistrer cette recharge dans mon budget <ArrowRight size={16} />
              </>
            )}
          </motion.button>

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ 
                marginTop: 12, 
                padding: '10px 14px', 
                borderRadius: 12, 
                background: 'rgba(16, 185, 129, 0.15)', 
                color: '#10b981', 
                fontSize: 13, 
                textAlign: 'center', 
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <CheckCircle2 size={16} /> {successMsg}
            </motion.div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
