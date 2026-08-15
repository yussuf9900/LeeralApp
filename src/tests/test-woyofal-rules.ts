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
    // TEST 4 : Senelec Postpayé - Calcul Bimestriel 60 jours (Prorata Défaut Senelec)
    // ----------------------------------------------------
    console.log('\n--- TEST 4 : Senelec Postpayé Bimestriel 60 jours (350 kWh) ---');
    const postCalc60 = await SenelecPostpaidCalculator.calculer(testUserId, 350, 'DIGITAL', { nombreJours: 60 });
    console.log(`Période: ${postCalc60.nombre_jours} jours`);
    console.log(`Consommation: ${postCalc60.consommation} kWh`);
    console.log(`Limite T1 (300 kWh): ${postCalc60.limite_t1} kWh | Montant T1: ${postCalc60.montant_t1} FCFA`);
    console.log(`Limite T2 (500 kWh): ${postCalc60.limite_t2} kWh | Montant T2: ${postCalc60.montant_t2} FCFA`);
    console.log(`Redevance (429 x 2): ${postCalc60.redevance} FCFA`);
    console.log(`TVA 18% (> 500 kWh): ${postCalc60.tva} FCFA`);
    console.log(`Montant TTC Total: ${postCalc60.montant_ttc} FCFA`);

    if (!postCalc60.redevance.equals(new Decimal(858))) {
      throw new Error(`TEST 4 ÉCHOUÉ : Redevance pour 60 jours devrait être 858 FCFA, obtenu ${postCalc60.redevance}`);
    }
    if (!postCalc60.limite_t1?.equals(new Decimal(300))) {
      throw new Error(`TEST 4 ÉCHOUÉ : Limite T1 pour 60j devrait être 300 kWh, obtenu ${postCalc60.limite_t1}`);
    }
    if (!postCalc60.tva.equals(new Decimal(0))) {
      throw new Error(`TEST 4 ÉCHOUÉ : La TVA devrait être 0 FCFA pour 350 kWh sur 60 jours (< 500 kWh threshold)`);
    }
    console.log('✅ TEST 4 RÉUSSI : Calcul Senelec Postpayé 60 jours proratisé vérifié !');

    // ----------------------------------------------------
    // TEST 5 : Senelec Postpayé Bimestriel 60 jours avec Dépassement TVA (> 500 kWh)
    // ----------------------------------------------------
    console.log('\n--- TEST 5 : Senelec Postpayé Bimestriel 60 jours (600 kWh ➔ TVA > 500 kWh) ---');
    const postCalcTva = await SenelecPostpaidCalculator.calculer(testUserId, 600, 'DIGITAL', { nombreJours: 60 });
    console.log(`Consommation: ${postCalcTva.consommation} kWh`);
    console.log(`TVA 18% sur 100 kWh excessif: ${postCalcTva.tva} FCFA`);

    if (postCalcTva.tva.lte(0)) {
      throw new Error(`TEST 5 ÉCHOUÉ : La TVA devrait être strictement positive pour 600 kWh sur 60j (> 500 kWh)`);
    }
    console.log('✅ TEST 5 RÉUSSI : Seuil de TVA à 500 kWh pour 60j validé avec succès !');

    // ----------------------------------------------------
    // TEST 6 : Senelec Postpayé Mensuel 30 jours (Prorata 1 mois)
    // ----------------------------------------------------
    console.log('\n--- TEST 6 : Senelec Postpayé Mensuel 30 jours (350 kWh) ---');
    const postCalc30 = await SenelecPostpaidCalculator.calculer(testUserId, 350, 'DIGITAL', { nombreJours: 30 });
    console.log(`Période: ${postCalc30.nombre_jours} jours`);
    console.log(`Limite T1 (150 kWh): ${postCalc30.limite_t1} kWh`);
    console.log(`Limite T2 (250 kWh): ${postCalc30.limite_t2} kWh`);
    console.log(`Redevance: ${postCalc30.redevance} FCFA`);
    console.log(`TVA 18% (> 250 kWh): ${postCalc30.tva} FCFA`);

    if (!postCalc30.redevance.equals(new Decimal(429))) {
      throw new Error(`TEST 6 ÉCHOUÉ : Redevance pour 30j devrait être 429 FCFA, obtenu ${postCalc30.redevance}`);
    }
    if (postCalc30.tva.lte(0)) {
      throw new Error(`TEST 6 ÉCHOUÉ : La TVA devrait s'appliquer pour 350 kWh sur 30j (> 250 kWh)`);
    }
    console.log('✅ TEST 6 RÉUSSI : Calcul mensuel 30 jours et déclenchement de TVA à 250 kWh validé !');

    // ----------------------------------------------------
    // TEST 7 : Reset Automatique au 1er du Mois Suivant (Date-Driven Reset Woyofal)
    // ----------------------------------------------------
    console.log('\n--- TEST 7 : Woyofal Achat dans un Nouveau Mois (ex: 2026-08-05 vs 2026-07-23) ---');
    const calcNextMonth = await SenelecWoyofalCalculator.calculerParMontant(testUserId, 5000, 'DIGITAL', 5, '2026-08-05');
    console.log(`Date Achat Cible: 2026-08-05`);
    console.log(`Cumul mois d'août avant achat: ${calcNextMonth.kwh_cumules_mois_avant} kWh (Doit être 0)`);
    console.log(`Redevance prélevée: ${calcNextMonth.redevance} FCFA (1er achat d'août)`);

    if (!calcNextMonth.kwh_cumules_mois_avant || !calcNextMonth.kwh_cumules_mois_avant.equals(new Decimal(0))) {
      throw new Error(`TEST 7 ÉCHOUÉ : Le cumul d'un nouveau mois doit repartir à 0 kWh`);
    }
    if (!calcNextMonth.redevance.equals(new Decimal(429))) {
      throw new Error(`TEST 7 ÉCHOUÉ : La redevance doit être prélevée au 1er achat du nouveau mois (429 FCFA)`);
    }
    console.log('✅ TEST 7 RÉUSSI : Reset du cumul mensuel et des frais fixes au 1er du mois validé !');

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
