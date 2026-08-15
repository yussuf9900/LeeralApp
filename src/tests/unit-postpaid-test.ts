import pool from '../config/database';
import { SenelecPostpaidCalculator } from '../services/senelec';
import Decimal from 'decimal.js';

async function runUnitTests() {
  console.log('====================================================');
  console.log('🧪 UNIT TESTS - Senelec Postpaid Date & Period Prorating');
  console.log('====================================================\n');

  // Mock pool.query for tariffs and configurations
  const originalQuery = pool.query;
  (pool as any).query = async (text: string, params?: any[]) => {
    if (text.includes('configurations')) {
      return {
        rows: [
          { cle: 'senelec_seuil_tva', valeur: '250.00' },
          { cle: 'senelec_reduction_t1', valeur: '0.10' }
        ]
      };
    }
    if (text.includes('tarifs')) {
      return {
        rows: [
          { type_tarif: 'DOMESTIQUE_SOCIAL', prix_par_unite: '91.00', palier_debut: '0.00' },
          { type_tarif: 'DOMESTIQUE_NON_SOCIAL', prix_par_unite: '136.49', palier_debut: '150.00' }
        ]
      };
    }
    return { rows: [] };
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Senelec Postpaid 60-day Bimestriel (350 kWh)
    // ----------------------------------------------------
    console.log('--- TEST 1: Senelec Postpaid Bimestriel 60 jours (350 kWh) ---');
    const calc60 = await SenelecPostpaidCalculator.calculer('user-1', 350, 'DIGITAL', { nombreJours: 60 });
    console.log(`Nombre de jours: ${calc60.nombre_jours}`);
    console.log(`Limite T1: ${calc60.limite_t1} kWh (Attendu: 300) | Montant T1: ${calc60.montant_t1} F (300 x 81.9 = 24570)`);
    console.log(`Limite T2: ${calc60.limite_t2} kWh (Attendu: 500) | Montant T2: ${calc60.montant_t2} F (50 x 136.49 = 6824.5)`);
    console.log(`Redevance: ${calc60.redevance} F (Attendu: 858 F)`);
    console.log(`TVA: ${calc60.tva} F (Attendu: 0 F car 350 < 500 kWh)`);

    if (calc60.nombre_jours !== 60) throw new Error(`Nb jours attendu 60, obtenu ${calc60.nombre_jours}`);
    if (!calc60.limite_t1?.equals(new Decimal(300))) throw new Error(`Limite T1 attendue 300, obtenue ${calc60.limite_t1}`);
    if (!calc60.redevance.equals(new Decimal(858))) throw new Error(`Redevance attendue 858, obtenue ${calc60.redevance}`);
    if (!calc60.tva.equals(new Decimal(0))) throw new Error(`TVA attendue 0, obtenue ${calc60.tva}`);
    console.log('✅ TEST 1 RÉUSSI !\n');

    // ----------------------------------------------------
    // TEST 2: Senelec Postpaid 60-day Bimestriel (600 kWh -> TVA > 500 kWh)
    // ----------------------------------------------------
    console.log('--- TEST 2: Senelec Postpaid Bimestriel 60 jours (600 kWh ➔ TVA > 500 kWh) ---');
    const calc60Tva = await SenelecPostpaidCalculator.calculer('user-1', 600, 'DIGITAL', { nombreJours: 60 });
    console.log(`Montant T1 (300 kWh): ${calc60Tva.montant_t1} F`);
    console.log(`Montant T2 (200 kWh): ${calc60Tva.montant_t2} F`);
    console.log(`Montant T3 (100 kWh): ${calc60Tva.montant_t3} F`);
    console.log(`TVA 18% sur 100 kWh (> 500 kWh): ${calc60Tva.tva} F`);

    if (calc60Tva.tva.lte(0)) throw new Error(`TVA devrait être > 0 FCFA pour 600 kWh sur 60j`);
    console.log('✅ TEST 2 RÉUSSI !\n');

    // ----------------------------------------------------
    // TEST 3: Senelec Postpaid 30-day Mensuel (350 kWh -> TVA > 250 kWh)
    // ----------------------------------------------------
    console.log('--- TEST 3: Senelec Postpaid Mensuel 30 jours (350 kWh) ---');
    const calc30 = await SenelecPostpaidCalculator.calculer('user-1', 350, 'DIGITAL', { nombreJours: 30 });
    console.log(`Nombre de jours: ${calc30.nombre_jours}`);
    console.log(`Limite T1: ${calc30.limite_t1} kWh (Attendu: 150)`);
    console.log(`Limite T2: ${calc30.limite_t2} kWh (Attendu: 250)`);
    console.log(`Redevance: ${calc30.redevance} F (Attendu: 429 F)`);
    console.log(`TVA 18%: ${calc30.tva} F (> 0 F car 350 > 250 kWh)`);

    if (!calc30.redevance.equals(new Decimal(429))) throw new Error(`Redevance attendue 429, obtenue ${calc30.redevance}`);
    if (calc30.tva.lte(0)) throw new Error(`TVA devrait être > 0 FCFA pour 350 kWh sur 30j`);
    console.log('✅ TEST 3 RÉUSSI !\n');

    // ----------------------------------------------------
    // TEST 4: Automatic Date Range Calculation (dateDebut -> dateFin)
    // ----------------------------------------------------
    console.log('--- TEST 4: Calcul automatique du nombre de jours par dates ---');
    const calcDates = await SenelecPostpaidCalculator.calculer('user-1', 300, 'DIGITAL', {
      dateDebut: '2026-01-01',
      dateFin: '2026-03-02' // 60 days
    });
    console.log(`Date début: ${calcDates.date_debut} | Date fin: ${calcDates.date_fin} | Jours calculés: ${calcDates.nombre_jours}`);
    if (calcDates.nombre_jours !== 60) throw new Error(`Nombre de jours par dates attendu 60, obtenu ${calcDates.nombre_jours}`);
    console.log('✅ TEST 4 RÉUSSI !\n');

    console.log('🎉 TOUS LES TESTS UNITAIRES SONT VALIDEZ AVEC SUCCÈS !');
  } catch (err: any) {
    console.error('❌ ERREUR :', err.message);
    process.exit(1);
  } finally {
    (pool as any).query = originalQuery;
  }
}

runUnitTests();
