import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Cookie, 
  Building2, 
  Scale,
  AlertTriangle
} from 'lucide-react';

export type LegalTab = 'mentions' | 'confidentialite' | 'cgu' | 'cookies';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export default function LegalModal({
  isOpen,
  onClose,
  initialTab = 'mentions'
}: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)'
        }}
        onClick={onClose}
      >
        <motion.div
          className="legal-modal-content"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 24,
            width: 'min(840px, 100%)',
            maxHeight: 'min(85vh, 760px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg), 0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b'
              }}>
                <Scale size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>
                  Cadre Juridique & Réglementation
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  République du Sénégal • Conformité CDP & CRSE
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs Nav */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(0, 0, 0, 0.08)',
            padding: '4px 16px',
            gap: 6,
            overflowX: 'auto'
          }}>
            {[
              { id: 'mentions', label: 'Mentions Légales', icon: Building2 },
              { id: 'confidentialite', label: 'Protection des Données (CDP)', icon: ShieldCheck },
              { id: 'cgu', label: 'CGU & Licence SaaS', icon: FileText },
              { id: 'cookies', label: 'Gestion des Cookies', icon: Cookie }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as LegalTab)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                    background: 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--text-secondary)'
          }}>
            {/* 1. MENTIONS LÉGALES */}
            {activeTab === 'mentions' && (
              <div>
                <h4 style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 800, marginBottom: 12 }}>
                  1. Identification de l'Éditeur
                </h4>
                <p>
                  L'application web et mobile <strong>Leeral</strong> est éditée par la société de technologies numériques :
                </p>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 20
                }}>
                  <p style={{ margin: '4px 0' }}><strong>Dénomination sociale :</strong> LEERAL TECHNOLOGIES SAS</p>
                  <p style={{ margin: '4px 0' }}><strong>Siège social :</strong> Dakar, République du Sénégal</p>
                  <p style={{ margin: '4px 0' }}><strong>Numéro NINEA :</strong> 009845231 2V3 (Immatriculation DGID Sénégal)</p>
                  <p style={{ margin: '4px 0' }}><strong>Registre du Commerce (RCCM) :</strong> SN.DKR.2026.B.14892 (Greffe du Tribunal de Commerce de Dakar)</p>
                  <p style={{ margin: '4px 0' }}><strong>Directeur de la publication :</strong> Direction Générale Leeral Technologies</p>
                  <p style={{ margin: '4px 0' }}><strong>Contact Support & Légal :</strong> legal@leeral.sn • support@leeral.sn</p>
                </div>

                <h4 style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 800, marginBottom: 12 }}>
                  2. Hébergement de l'Infrastructure
                </h4>
                <p>
                  L'infrastructure cloud, les serveurs d'application et la base de données PostgreSQL de Leeral sont hébergés auprès de prestataires de classe internationale garantissant un chiffrement conforme aux normes de sécurité modernes (chiffrement au repos AES-256 et en transit TLS 1.3).
                </p>
              </div>
            )}

            {/* 2. POLITIQUE DE CONFIDENTIALITÉ CDP SÉNÉGAL */}
            {activeTab === 'confidentialite' && (
              <div>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 20,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center'
                }}>
                  <ShieldCheck size={28} color="#10b981" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#10b981', display: 'block', fontSize: 13 }}>
                      Conformité Légale - Loi n° 2008-12 du 25 janvier 2008
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Traitement des données déclaré auprès de la Commission de Protection des Données Personnelles (CDP) du Sénégal.
                    </span>
                  </div>
                </div>

                <h4 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  1. Finalités du Traitement
                </h4>
                <p>
                  Les données personnelles collectées (nom, adresse email, mot de passe haché, historique de factures, index et numéros de compteurs Woyofal/Sen'Eau) sont strictement limitées aux finalités suivantes :
                </p>
                <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                  <li>Simulation et vérification de la justesse des factures d'eau et d'électricité ;</li>
                  <li>Déclenchement d'alertes préventives lors de l'approche du seuil de budget ou de tranche tarifaire ;</li>
                  <li>Conseils d'efficacité énergétique et d'optimisation financière.</li>
                </ul>

                <h4 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  2. Droits des Usagers Sénégalais
                </h4>
                <p>
                  Conformément aux dispositions de la <strong>Loi n° 2008-12</strong>, tout utilisateur dispose des droits inaliénables suivants :
                </p>
                <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                  <li><strong>Droit d'accès et d'information :</strong> Obtenir communication de l'intégralité de ses données stockées.</li>
                  <li><strong>Droit de rectification :</strong> Corriger en temps réel son profil, ses compteurs et son budget.</li>
                  <li><strong>Droit de suppression et à l'oubli :</strong> Demander l'effacement définitif de son compte et de ses factures.</li>
                  <li><strong>Droit d'opposition :</strong> S'opposer aux communications non essentielles.</li>
                </ul>

                <h4 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  3. Contact DPO & Recours Réglementaire
                </h4>
                <p>
                  Pour exercer vos droits, vous pouvez adresser votre demande au Délégué à la Protection des Données : <code>dpo@leeral.sn</code>.
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  En cas de litige non résolu, vous pouvez saisir l'autorité nationale de contrôle :<br />
                  <strong>Commission de Protection des Données Personnelles (CDP)</strong><br />
                  34 Sicap Liberté 4, Dakar, Sénégal • Site officiel : <a href="https://www.cdp.sn" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>cdp.sn</a>
                </p>
              </div>
            )}

            {/* 3. CONDITIONS GÉNÉRALES D'UTILISATION (CGU) */}
            {activeTab === 'cgu' && (
              <div>
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 20,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center'
                }}>
                  <AlertTriangle size={28} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#f59e0b', display: 'block', fontSize: 13 }}>
                      Clause Essentielle de Simulation Prédictive
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Leeral est un outil d'aide à la décision et de simulation. En cas de divergence, seule la facture officielle émise par Senelec ou Sen'Eau fait foi juridiquement.
                    </span>
                  </div>
                </div>

                <h4 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  1. Licence d'Utilisation
                </h4>
                <p>
                  Leeral concède à l'utilisateur une licence personnelle, non exclusive, non transférable et révocable d'utilisation de la plateforme. Tout rétro-ingénierie, extraction automatisée (scraping) ou utilisation illicite des moteurs de calcul est strictement prohibé.
                </p>

                <h4 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  2. Responsabilité & Moteurs de Calcul
                </h4>
                <p>
                  Les algorithmes de calcul appliqués par Leeral reproduisent fidèlement les grilles et arrêtés tarifaires de la <strong>CRSE</strong> (Commission de Régulation du Secteur de l'Énergie) et de la <strong>SONES</strong> (Société Nationale des Eaux du Sénégal). Toutefois, Leeral ne se substitue pas aux concessionnaires de distribution publique d'eau ou d'électricité.
                </p>

                <h4 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  3. Droit Applicable & Juridiction Compétente
                </h4>
                <p>
                  Les présentes conditions générales sont régies et interprétées conformément au <strong>droit de la République du Sénégal</strong>. Tout litige relatif à leur validité ou exécution relève de la compétence exclusive des <strong>tribunaux de Dakar</strong>.
                </p>
              </div>
            )}

            {/* 4. GESTION DES COOKIES */}
            {activeTab === 'cookies' && (
              <div>
                <h4 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  Politique Relative aux Témoins de Connexion (Cookies)
                </h4>
                <p>
                  Conformément aux directives de la CDP et au RGPD, Leeral garantit une gestion transparente de vos préférences :
                </p>

                <div style={{ marginTop: 16 }}>
                  <div style={{
                    padding: 14,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    marginBottom: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>1. Cookies Strictement Nécessaires</strong>
                      <span style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                        Toujours Actifs
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12 }}>
                      Ces témoins sont indispensables au fonctionnement sécurisé de Leeral (jeton JWT de session, mémorisation du thème d'affichage clair/sombre, protection CSRF). Ils ne collectent aucune donnée à des fins publicitaires.
                    </p>
                  </div>

                  <div style={{
                    padding: 14,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>2. Cookies de Mesure d'Audience & Performance</strong>
                      <span style={{ fontSize: 11, background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                        Soumis à consentement
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12 }}>
                      Ces témoins anonymes permettent de mesurer les fonctionnalités les plus consultées (simulateur, gestionnaire de compteurs) afin d'optimiser la performance et la rapidité du service au Sénégal.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <button
              onClick={onClose}
              className="btn-premium btn-premium-primary"
              style={{ padding: '10px 24px', fontSize: 13 }}
            >
              Fermer la fenêtre
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
