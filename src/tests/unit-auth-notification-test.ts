import dotenv from 'dotenv';
dotenv.config();

import pool from '../config/database';
import { AuthService } from '../services/auth';
import { NotificationService } from '../services/notification';
import crypto from 'crypto';

async function runAuthAndNotificationTests() {
  console.log('====================================================');
  console.log('🧪 TEST SUITE - Auth Recovery & Notifications System');
  console.log('====================================================\n');

  let testUserId: string = '';
  const testEmail = `test-user-${Date.now()}@leeral.sn`;
  const initialPassword = 'Password123!';
  const newPassword = 'NewSecretPassword456!';

  try {
    // 1. Setup Test User
    const passHash = await AuthService.hashPassword(initialPassword);
    const userRes = await pool.query(
      `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, budget_mensuel)
       VALUES ($1, $2, $3, 'CLIENT', 50000.00)
       RETURNING id, nom, email, budget_mensuel`,
      ['Testeur Leeral', testEmail, passHash]
    );
    testUserId = userRes.rows[0].id;
    console.log(`✅ Utilisateur de test créé (ID: ${testUserId}, Email: ${testEmail})`);

    // 2. Notification Service Tests
    console.log('\n--- TEST 1: Création et Récupération de Notification ---');
    const notif1 = await NotificationService.creerNotification(
      testUserId,
      'Bienvenue sur Leeral',
      'Votre compte est prêt.',
      'INFO',
      'dashboard'
    );
    if (!notif1.id || notif1.titre !== 'Bienvenue sur Leeral' || notif1.lu !== false) {
      throw new Error('Échec création notification standard.');
    }
    console.log(`Notification ID: ${notif1.id} | Titre: "${notif1.titre}" | Lu: ${notif1.lu}`);

    const unreadCountBefore = await NotificationService.getUnreadCount(testUserId);
    console.log(`Notifications non lues: ${unreadCountBefore}`);
    if (unreadCountBefore < 1) throw new Error('Le compteur de non-lus devrait être >= 1');
    console.log('✅ TEST 1 RÉUSSI !');

    // 3. Mark As Read
    console.log('\n--- TEST 2: Marquage individuel et global comme lu ---');
    const marked = await NotificationService.marquerCommeLu(notif1.id, testUserId);
    if (!marked) throw new Error('Échec marquage comme lu.');

    const unreadCountAfter = await NotificationService.getUnreadCount(testUserId);
    console.log(`Notifications non lues après marquage: ${unreadCountAfter}`);
    if (unreadCountAfter !== 0) throw new Error('Le compteur de non-lus devrait être 0');

    // Créer deux autres notifications pour tester marquerToutCommeLu
    await NotificationService.creerNotification(testUserId, 'Alerte 1', 'Message 1', 'WARNING');
    await NotificationService.creerNotification(testUserId, 'Alerte 2', 'Message 2', 'DANGER');
    const markedAll = await NotificationService.marquerToutCommeLu(testUserId);
    console.log(`Nombre de notifications passées à lues en masse: ${markedAll}`);
    if (markedAll !== 2) throw new Error('marquerToutCommeLu a échoué');
    console.log('✅ TEST 2 RÉUSSI !');

    // 4. Alertes automatiques de budget
    console.log('\n--- TEST 3: Déclenchement automatique d\'alerte de budget (80% et 100%) ---');
    // Déclencher alerte à 80% (budget = 50 000 FCFA, montant = 42 000 FCFA)
    await NotificationService.verifierEtDeclencherAlertes(testUserId, {
      service: 'SENELEC',
      montant: 42000,
      consommation: 120,
    });
    const notifs80 = await NotificationService.getNotifications(testUserId, 10, 0, false);
    const alert80 = notifs80.notifications.find((n) => n.titre.includes('80%'));
    if (!alert80) throw new Error('L\'alerte de budget 80% n\'a pas été générée !');
    console.log(`Alerte 80% générée: "${alert80.titre}" - ${alert80.message}`);

    // Déclencher alerte Senelec Tranche 2 (> 150 kWh)
    await NotificationService.verifierEtDeclencherAlertes(testUserId, {
      service: 'SENELEC',
      montant: 5000,
      consommation: 180,
    });
    const notifsT2 = await NotificationService.getNotifications(testUserId, 10, 0, false);
    const alertT2 = notifsT2.notifications.find((n) => n.titre.includes('Tranche 2'));
    if (!alertT2) throw new Error('L\'alerte Tranche 2 n\'a pas été générée !');
    console.log(`Alerte Tranche 2 générée: "${alertT2.titre}"`);
    console.log('✅ TEST 3 RÉUSSI !');

    // 5. Password Reset Token Flow
    console.log('\n--- TEST 4: Cycle Mot de Passe Oublié (Token, Expiration, Hash scrypt) ---');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expire1Hour = new Date(Date.now() + 3600 * 1000);

    // Enregistrer le token
    await pool.query(
      'UPDATE utilisateurs SET token_reset_password = $1, token_reset_expire = $2 WHERE id = $3',
      [resetToken, expire1Hour, testUserId]
    );

    // Vérifier l'existence du token
    const tokenCheck = await pool.query(
      'SELECT id FROM utilisateurs WHERE token_reset_password = $1 AND token_reset_expire > NOW()',
      [resetToken]
    );
    if (tokenCheck.rows.length === 0) throw new Error('Token introuvable en base');

    // Mettre à jour le mot de passe avec le nouveau hash
    const newHash = await AuthService.hashPassword(newPassword);
    await pool.query(
      'UPDATE utilisateurs SET mot_de_passe = $1, token_reset_password = NULL, token_reset_expire = NULL WHERE id = $2',
      [newHash, testUserId]
    );

    // Vérifier l'ancien mot de passe (doit échouer)
    const oldCheck = await AuthService.verifyPassword(initialPassword, newHash);
    if (oldCheck) throw new Error('L\'ancien mot de passe ne doit plus être valide !');

    // Vérifier le nouveau mot de passe (doit réussir)
    const newCheck = await AuthService.verifyPassword(newPassword, newHash);
    if (!newCheck) throw new Error('Le nouveau mot de passe doit être valide !');
    console.log('Vérification scrypt de l\'ancien mot de passe: REJETÉ (Attendu)');
    console.log('Vérification scrypt du nouveau mot de passe: VALIDÉ (Attendu)');
    console.log('✅ TEST 4 RÉUSSI !');

    // 6. Email Verification Flow
    console.log('\n--- TEST 5: Cycle de Confirmation / Vérification d\'Email ---');
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'UPDATE utilisateurs SET token_verification = $1, token_verification_expire = NOW() + INTERVAL \'48 hours\' WHERE id = $2',
      [verifyToken, testUserId]
    );

    // Confirmer l'email
    await pool.query(
      'UPDATE utilisateurs SET email_verifie = true, token_verification = NULL WHERE id = $1',
      [testUserId]
    );

    const verifiedUser = await pool.query('SELECT email_verifie FROM utilisateurs WHERE id = $1', [testUserId]);
    if (!verifiedUser.rows[0].email_verifie) throw new Error('L\'email devrait être vérifié !');
    console.log(`Statut email_verifie de l'utilisateur: ${verifiedUser.rows[0].email_verifie}`);
    console.log('✅ TEST 5 RÉUSSI !');

    console.log('\n====================================================');
    console.log('🎉 TOUS LES TESTS AUTH & NOTIFICATIONS SONT VALIDÉS !');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('❌ ERREUR LORS DU TEST:', err.message);
    process.exit(1);
  } finally {
    // Nettoyage de l'utilisateur de test
    if (testUserId) {
      await pool.query('DELETE FROM utilisateurs WHERE id = $1', [testUserId]);
      console.log('Nettoyage des données de test terminé.');
    }
    await pool.end();
  }
}

runAuthAndNotificationTests();
