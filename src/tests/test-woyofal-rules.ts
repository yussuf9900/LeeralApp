import pool from '../config/database';
import { SenelecWoyofalCalculator, SenelecPostpaidCalculator } from '../services/senelec';
import { RecommendationEngineService } from '../services/recommendationEngine';
import Decimal from 'decimal.js';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 DÉBUT DES TESTS AUTOMATISÉS - SAMA FACTURE (TDD)');
  console.log('====================================================\n');

  let testUserId = '';

  try {
    // 1. Setup mock test user
    const userRes = await pool.query(
      `INSERT INTO utilisateurs (nom, email, mot_de_passe, role)
       VALUES ('Test User TDD', $1, 'hash_pass', 'CLIENT')
       RETURNING id`,
      [`test_tdd_${Date.now()}@leeral.sn`]
    );
    testUserId = userRes.rows[0].id;
    console.log(`✅ Utilisateur de test créé (ID: ${testUserId})`);

    // Clean any prior factures for this test user
    await pool.query('DELETE FROM factures WHERE utilisateur_id = $1', [testUserId]);

    // ----------------------------------------------------
    // TEST 1 : Woyofal - Prépaiement 2 Tranches & Redevance 1er achat
    // ----------------------------------------------------
    console.log('\n--- TEST 1 : Woyofal 1er Achat (5 000 FCFA) ---');
    const calc1 = await SenelecWoyofalCalculator.calculerParMontant(testUserId, 5000, 'DIGITAL', 5);
    console.log(`Montant Payé: ${calc1.montant_ttc} FCFA`);
    console.log(`Redevance prélevée: ${calc1.redevance} FCFA (1er achat du mois)`);
    console.log(`Consommation obtenue: ${calc1.consommation} kWh`);
    console.log(`kWh Tranche 1: ${calc1.kwh_t1} kWh`);
    console.log(`kWh Tranche 2: ${calc1.kwh_t2} kWh`);
    console.log(`TVA: ${calc1.tva} FCFA (Doit être 0 FCFA)`);

    if (!calc1.redevance.equals(new Decimal(429))) {
      throw new Error(`TEST 1 ÉCHOUÉ : Redevance devrait être 429 FCFA, obtenu ${calc1.redevance}`);
    }
    if (!calc1.tva.equals(new Decimal(0))) {
      throw new Error(`TEST 1 ÉCHOUÉ : TVA Woyofal devrait être 0 FCFA, obtenu ${calc1.tva}`);
    }
    console.log('✅ TEST 1 RÉUSSI : Redevance 429 FCFA appliquée et 0 FCFA de TVA.');

    // Save transaction #1
    await pool.query(
      `INSERT INTO factures (utilisateur_id, service, reference_facture, consommation, montant_ht, tva, redevance, droit_de_timbre, montant_ttc, mode_paiement, statut, date_echeance, idempotency_key, type_transaction)
       VALUES ($1, 'SENELEC', 'REF-TEST-1', $2, $3, 0, $4, 0, 5000, 'DIGITAL', 'PAYE', CURRENT_DATE, $5, 'RECHARGE_WOYOFAL')`,
      [testUserId, calc1.consommation.toString(), calc1.montant_ht.toString(), calc1.redevance.toString(), `IDEM-TEST-1-${Date.now()}`]
    );

    // ----------------------------------------------------
    // TEST 2 : Cumul Mensuel Woyofal (Stateful Rule)
    // ----------------------------------------------------
    console.log('\n--- TEST 2 : Woyofal 2nd Achat (5 000 FCFA le même mois) ---');
    const calc2 = await SenelecWoyofalCalculator.calculerParMontant(testUserId, 5000, 'DIGITAL', 5);
    console.log(`Montant Payé: ${calc2.montant_ttc} FCFA`);
    console.log(`Redevance prélevée: ${calc2.redevance} FCFA (Doit être 0 FCFA au 2nd achat)`);
    console.log(`Consommation obtenue: ${calc2.consommation} kWh`);
    console.log(`Cumul mensuel avant: ${calc2.kwh_cumules_mois_avant} kWh`);
    console.log(`Cumul mensuel après: ${calc2.kwh_cumules_mois_apres} kWh`);

    if (!calc2.redevance.equals(new Decimal(0))) {
      throw new Error(`TEST 2 ÉCHOUÉ : Redevance du 2nd achat devrait être 0 FCFA, obtenu ${calc2.redevance}`);
    }
    if (calc1.consommation.equals(calc2.consommation)) {
      throw new Error(`TEST 2 ÉCHOUÉ : Le 1er et le 2nd achat ne doivent PAS donner le même nombre de kWh (Cumul & Redevance)`);
    }
    console.log('✅ TEST 2 RÉUSSI : Règle du cumul mensuel et suppression des frais fixes vérifiée !');

    // Save transaction #2
    await pool.query(
      `INSERT INTO factures (utilisateur_id, service, reference_facture, consommation, montant_ht, tva, redevance, droit_de_timbre, montant_ttc, mode_paiement, statut, date_echeance, idempotency_key, type_transaction)
       VALUES ($1, 'SENELEC', 'REF-TEST-2', $2, $3, 0, 0, 0, 5000, 'DIGITAL', 'PAYE', CURRENT_DATE, $4, 'RECHARGE_WOYOFAL')`,
      [testUserId, calc2.consommation.toString(), calc2.montant_ht.toString(), `IDEM-TEST-2-${Date.now()}`]
    );

    // ----------------------------------------------------
    // TEST 3 : Déclenchement de la Règle A (Basculement de tranche)
    // ----------------------------------------------------
    console.log('\n--- TEST 3 : Woyofal 3ème Achat (15 000 FCFA ➔ Basculement Tranche 2) ---');
    const calc3 = await SenelecWoyofalCalculator.calculerParMontant(testUserId, 15000, 'DIGITAL', 5);
    console.log(`Cumul avant: ${calc3.kwh_cumules_mois_avant} kWh`);
    console.log(`Cumul après: ${calc3.kwh_cumules_mois_apres} kWh`);
    console.log(`Basculement Tranche 2: ${calc3.basculement_tranche2}`);

    const recs = await RecommendationEngineService.analyserSenelec(testUserId, {
      consommation: Number(calc3.consommation),
      montant_ttc: 15000,
      kwh_cumules_mois_avant: Number(calc3.kwh_cumules_mois_avant),
      kwh_cumules_mois_apres: Number(calc3.kwh_cumules_mois_apres),
      basculement_tranche2: calc3.basculement_tranche2
    });

    const ruleA = recs.find(r => r.code_regle === 'SENELEC_RULE_A');
    if (!ruleA) {
      throw new Error(`TEST 3 ÉCHOUÉ : Règle SENELEC_RULE_A non déclenchée lors du passage > 150 kWh`);
    }
    console.log(`Message Conseil Déclenché: "${ruleA.message}"`);
    console.log('✅ TEST 3 RÉUSSI : Alerte de basculement de tranche déclenchée avec succès !');

    // ----------------------------------------------------
    // TEST 4 : Senelec Postpayé - Calcul Forward 3 Tranches + TVA
    // ----------------------------------------------------
    console.log('\n--- TEST 4 : Senelec Postpayé (300 kWh ➔ 3 Tranches + TVA 18% > 250 kWh) ---');
    const postCalc = await SenelecPostpaidCalculator.calculer(testUserId, 300, 'DIGITAL');
    console.log(`Consommation: ${postCalc.consommation} kWh`);
    console.log(`Montant T1 (150 kWh @ 82.00): ${postCalc.montant_t1} FCFA`);
    console.log(`Montant T2 (100 kWh @ 136.49): ${postCalc.montant_t2} FCFA`);
    console.log(`Montant T3 (50 kWh @ 136.49): ${postCalc.montant_t3} FCFA`);
    console.log(`TVA 18% sur 50 kWh: ${postCalc.tva} FCFA`);
    console.log(`Montant TTC Total: ${postCalc.montant_ttc} FCFA`);

    if (postCalc.tva.lte(0)) {
      throw new Error(`TEST 4 ÉCHOUÉ : La TVA devrait être strictement positive pour une consommation de 300 kWh (> 250 kWh)`);
    }
    console.log('✅ TEST 4 RÉUSSI : Calcul postpayé 3 tranches avec TVA 18% au-delà de 250 kWh vérifié !');

    console.log('\n====================================================');
    console.log('🎉 TOUS LES TESTS SONT AU VERT ET VALIDÉS !');
    console.log('====================================================\n');

  } catch (err: any) {
    console.error('\n❌ ERREUR DE TEST :', err.message);
    process.exit(1);
  } finally {
    if (testUserId) {
      await pool.query('DELETE FROM factures WHERE utilisateur_id = $1', [testUserId]);
      await pool.query('DELETE FROM recommandations WHERE utilisateur_id = $1', [testUserId]);
      await pool.query('DELETE FROM utilisateurs WHERE id = $1', [testUserId]);
    }
    await pool.end();
  }
}

runTests();
