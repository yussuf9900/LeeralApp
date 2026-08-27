import pool from '../config/database';
import { SeneauCalculator } from '../services/seneau';
import Decimal from 'decimal.js';

async function runUnitTests() {
  console.log('====================================================');
  console.log('🧪 UNIT TESTS - Sen\'Eau Period Prorating & Calculations');
  console.log('====================================================\n');

  // Mock pool.query for tariffs and user profile
  const originalQuery = pool.query;
  (pool as any).query = async (text: string, params?: any[]) => {
    if (text.includes('FROM utilisateurs')) {
      return {
        rows: [
          { is_subvented: false, ville_type: 'NON_ASSAINIE' }
        ]
      };
    }
    if (text.includes('FROM tarifs')) {
      return {
        rows: [
          { type_tarif: 'SOCIAL_ASSAINIE', prix_par_unite: '202.00' },
          { type_tarif: 'SOCIAL_NON_ASSAINIE', prix_par_unite: '188.50' },
          { type_tarif: 'PLEINE_ASSAINIE', prix_par_unite: '697.97' },
          { type_tarif: 'PLEINE_NON_ASSAINIE', prix_par_unite: '636.34' },
          { type_tarif: 'DISSUASIVE_ASSAINIE', prix_par_unite: '878.35' },
          { type_tarif: 'DISSUASIVE_NON_ASSAINIE', prix_par_unite: '778.87' }
        ]
      };
    }
    return { rows: [] };
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Sen'Eau Bimestriel 60 jours Standard (35 m3, Non Assainie)
    // ----------------------------------------------------
    console.log('--- TEST 1: Sen\'Eau Bimestriel 60 jours (35 m³, Non Assainie) ---');
    const calc60 = await SeneauCalculator.calculer('user-1', 35, 'DIGITAL', { nombreJours: 60 });
    console.log(`Nombre de jours: ${calc60.nombre_jours}`);
    console.log(`Limite Sociale: ${calc60.limite_sociale} m³ (Attendu: 20) | Montant Social: ${calc60.montant_social} F (20 x 188.50 = 3770 F)`);
    console.log(`Limite Pleine: ${calc60.limite_pleine} m³ (Attendu: 40) | Montant Plein: ${calc60.montant_pleine} F (15 x 636.34 = 9545.10 F)`);
    console.log(`Montant Dissuasif: ${calc60.montant_dissuasive} F (Attendu: 0 F)`);
    console.log(`Montant Total TTC: ${calc60.montant_ttc} F`);

    if (calc60.nombre_jours !== 60) throw new Error(`Nb jours attendu 60, obtenu ${calc60.nombre_jours}`);
    if (!calc60.limite_sociale?.equals(new Decimal(20))) throw new Error(`Limite Sociale attendue 20, obtenue ${calc60.limite_sociale}`);
    if (!calc60.limite_pleine?.equals(new Decimal(40))) throw new Error(`Limite Pleine attendue 40, obtenue ${calc60.limite_pleine}`);
    if (!calc60.volume_social?.equals(new Decimal(20))) throw new Error(`Volume Social attendu 20, obtenu ${calc60.volume_social}`);
    if (!calc60.volume_pleine?.equals(new Decimal(15))) throw new Error(`Volume Plein attendu 15, obtenu ${calc60.volume_pleine}`);
    if (!calc60.volume_dissuasive?.equals(new Decimal(0))) throw new Error(`Volume Dissuasif attendu 0, obtenu ${calc60.volume_dissuasive}`);
    console.log('✅ TEST 1 RÉUSSI !\n');

    // ----------------------------------------------------
    // TEST 2: Sen'Eau Mensuel 30 jours (35 m3 -> Dissuasive atteinte)
    // ----------------------------------------------------
    console.log('--- TEST 2: Sen\'Eau Mensuel 30 jours (35 m³ ➔ Dissuasive atteinte) ---');
    const calc30 = await SeneauCalculator.calculer('user-1', 35, 'DIGITAL', { nombreJours: 30 });
    console.log(`Nombre de jours: ${calc30.nombre_jours}`);
    console.log(`Limite Sociale: ${calc30.limite_sociale} m³ (Attendu: 10) | Volume Social: ${calc30.volume_social} m³`);
    console.log(`Limite Pleine: ${calc30.limite_pleine} m³ (Attendu: 20) | Volume Plein: ${calc30.volume_pleine} m³`);
    console.log(`Volume Dissuasif: ${calc30.volume_dissuasive} m³ (Attendu: 15 m³) | Montant Dissuasif: ${calc30.montant_dissuasive} F`);

    if (calc30.nombre_jours !== 30) throw new Error(`Nb jours attendu 30, obtenu ${calc30.nombre_jours}`);
    if (!calc30.limite_sociale?.equals(new Decimal(10))) throw new Error(`Limite Sociale attendue 10, obtenue ${calc30.limite_sociale}`);
    if (!calc30.limite_pleine?.equals(new Decimal(20))) throw new Error(`Limite Pleine attendue 20, obtenue ${calc30.limite_pleine}`);
    if (!calc30.volume_social?.equals(new Decimal(10))) throw new Error(`Volume Social attendu 10, obtenu ${calc30.volume_social}`);
    if (!calc30.volume_pleine?.equals(new Decimal(10))) throw new Error(`Volume Plein attendu 10, obtenu ${calc30.volume_pleine}`);
    if (!calc30.volume_dissuasive?.equals(new Decimal(15))) throw new Error(`Volume Dissuasif attendu 15, obtenu ${calc30.volume_dissuasive}`);
    console.log('✅ TEST 2 RÉUSSI !\n');

    // ----------------------------------------------------
    // TEST 3: Dates de début et fin automatiques (ex: 45 jours)
    // ----------------------------------------------------
    console.log('--- TEST 3: Calcul automatique par plage de dates (45 jours) ---');
    const calcDates = await SeneauCalculator.calculer('user-1', 30, 'DIGITAL', {
      dateDebut: '2026-01-01',
      dateFin: '2026-02-15' // 45 days
    });
    console.log(`Date début: ${calcDates.date_debut} | Date fin: ${calcDates.date_fin} | Jours calculés: ${calcDates.nombre_jours}`);
    console.log(`Limite Sociale: ${calcDates.limite_sociale} m³ (Attendu: 15 m³) | Limite Pleine: ${calcDates.limite_pleine} m³ (Attendu: 30 m³)`);
    
    if (calcDates.nombre_jours !== 45) throw new Error(`Nb jours attendu 45, obtenu ${calcDates.nombre_jours}`);
    if (!calcDates.limite_sociale?.equals(new Decimal(15))) throw new Error(`Limite Sociale attendue 15, obtenue ${calcDates.limite_sociale}`);
    if (!calcDates.limite_pleine?.equals(new Decimal(30))) throw new Error(`Limite Pleine attendue 30, obtenue ${calcDates.limite_pleine}`);
    console.log('✅ TEST 3 RÉUSSI !\n');

    // ----------------------------------------------------
    // TEST 4: Zone Assainie (Ville avec Égouts) + Mode Cash (+1% timbre)
    // ----------------------------------------------------
    console.log('--- TEST 4: Zone Assainie + Mode Cash (+1% droit de timbre) ---');
    const calcAssainie = await SeneauCalculator.calculer('user-1', 20, 'CASH', {
      nombreJours: 60,
      villeType: 'ASSAINIE'
    });
    console.log(`Montant HT (20 x 202.00): ${calcAssainie.montant_ht} F (Attendu: 4040 F)`);
    console.log(`Droit de timbre (1%): ${calcAssainie.droit_de_timbre} F (Attendu: 40.40 F)`);
    console.log(`Montant TTC: ${calcAssainie.montant_ttc} F (Attendu: 4080.40 F)`);

    if (!calcAssainie.montant_ht.equals(new Decimal(4040))) throw new Error(`Montant HT attendu 4040, obtenu ${calcAssainie.montant_ht}`);
    if (!calcAssainie.droit_de_timbre.equals(new Decimal(40.4))) throw new Error(`Droit de timbre attendu 40.4, obtenu ${calcAssainie.droit_de_timbre}`);
    console.log('✅ TEST 4 RÉUSSI !\n');

    console.log('🎉 TOUS LES TESTS UNITAIRES SEN\'EAU SONT VALIDÉS AVEC SUCCÈS !');
  } catch (err: any) {
    console.error('❌ ERREUR :', err.message);
    process.exit(1);
  } finally {
    (pool as any).query = originalQuery;
  }
}

runUnitTests();
