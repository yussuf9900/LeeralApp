
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Droplet, CreditCard } from 'lucide-react';

interface TransactionListProps {
  history: any[];
  onPay: (id: string) => Promise<void>;
}

export default function TransactionList({
  history,
  onPay
}: TransactionListProps) {
  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>
        Aucune transaction enregistrée dans votre historique.
      </div>
    );
  }

  return (
    <div className="transaction-group">
      <AnimatePresence>
        {history.map((item, index) => {
          const isSenelec = item.service === 'SENELEC';
          const isPaye = item.statut === 'PAYE';
          
          return (
            <motion.div
              key={item.id}
              className="transaction-card"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
                {/* Icon box */}
                <div className={`icon-box ${isSenelec ? 'senelec' : 'seneau'}`}>
                  {isSenelec ? (
                    <Zap size={20} fill="var(--color-warning)" />
                  ) : (
                    <Droplet size={20} fill="var(--color-primary)" />
                  )}
                </div>
                
                {/* Left side details */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800 }}>
                    {isSenelec ? 'Recharge Senelec' : "Facture Sen'Eau"}
                  </h4>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                    {new Date(item.cree_a).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  
                  {/* Additional info badge */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: 11, 
                    color: 'var(--text-secondary)', 
                    background: 'rgba(148, 163, 184, 0.06)', 
                    padding: '6px 10px', 
                    borderRadius: 8, 
                    marginTop: 8,
                    fontWeight: 600
                  }}>
                    <span>Index: {parseFloat(item.ancien_index)} &rarr; {parseFloat(item.nouvel_index)}</span>
                    <span>Consommé: {parseFloat(item.consommation)} {isSenelec ? 'kWh' : 'm³'}</span>
                  </div>

                  {/* Payment button if unpaid water bill */}
                  {!isSenelec && !isPaye && (
                    <button 
                      onClick={() => onPay(item.id)}
                      className="btn-premium btn-premium-primary"
                      style={{ 
                        padding: '8px 14px', 
                        fontSize: 12, 
                        borderRadius: 10, 
                        marginTop: 10,
                        width: 'auto',
                        boxShadow: 'none'
                      }}
                    >
                      <CreditCard size={14} />
                      Régler la facture
                    </button>
                  )}
                </div>

                {/* Right side amount & status */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 12 }}>
                  <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    {parseFloat(item.montant_ttc).toLocaleString()} F
                  </span>
                  
                  <span className={`badge-premium ${isPaye ? 'success' : 'warning'}`}>
                    {isPaye ? 'Payé' : 'Impayé'}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
