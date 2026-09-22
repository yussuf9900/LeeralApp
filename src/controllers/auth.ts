import { Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../config/database';
import { AuthService } from '../services/auth';
import { EmailService } from '../services/email';
import { NotificationService } from '../services/notification';

export class AuthController {
  /**
   * Enregistrement d'un nouvel utilisateur
   */
  static async register(req: Request, res: Response): Promise<any> {
    const { nom, email, mot_de_passe, role, is_subvented, ville_type } = req.body;

    // Validation des champs
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({ error: 'Champs requis manquants (nom, email, mot_de_passe)' });
    }

    if (mot_de_passe.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format de l\'adresse email invalide' });
    }

    try {
      // Vérifier si l'email existe déjà
      const checkEmail = await pool.query('SELECT id FROM utilisateurs WHERE email = $1', [email]);
      if (checkEmail.rows.length > 0) {
        return res.status(409).json({ error: 'Cette adresse email est déjà enregistrée' });
      }

      // Hachage scrypt du mot de passe
      const passwordHash = await AuthService.hashPassword(mot_de_passe);
      
      const userRole = role === 'ADMIN' ? 'ADMIN' : 'CLIENT';
      const subvented = is_subvented === true;
      const vType = ville_type === 'ASSAINIE' ? 'ASSAINIE' : 'NON_ASSAINIE';

      // Génération du jeton d'activation d'email (48h de validité)
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpire = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Insertion en base
      const insertQuery = `
        INSERT INTO utilisateurs (
          nom, email, mot_de_passe, role, is_subvented, ville_type, 
          email_verifie, token_verification, token_verification_expire
        )
        VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
        RETURNING id, nom, email, role, is_subvented, ville_type, budget_mensuel, email_verifie, cree_a
      `;
      const result = await pool.query(insertQuery, [
        nom, email, passwordHash, userRole, subvented, vType, verificationToken, tokenExpire
      ]);
      const newUser = result.rows[0];

      // Envoi de l'email de confirmation
      EmailService.sendVerificationEmail(newUser.email, newUser.nom, verificationToken).catch((err) => {
        console.error('[AuthController] Erreur envoi email confirmation:', err);
      });

      // Notification de bienvenue in-app
      NotificationService.creerNotification(
        newUser.id,
        '🎉 Bienvenue sur Leeral !',
        'Votre compte a été créé avec succès. Configurez votre budget et commencez à simuler vos factures d\'eau et d\'électricité.',
        'SUCCESS',
        'profile'
      ).catch((err) => console.error('[AuthController] Erreur notification bienvenue:', err));

      // Génération du jeton JWT
      const token = AuthService.generateToken(newUser);

      res.status(201).json({
        message: 'Utilisateur enregistré avec succès',
        token,
        user: {
          id: newUser.id,
          nom: newUser.nom,
          email: newUser.email,
          role: newUser.role,
          is_subvented: newUser.is_subvented,
          ville_type: newUser.ville_type,
          budget_mensuel: newUser.budget_mensuel,
          email_verifie: newUser.email_verifie,
        }
      });
    } catch (err: any) {
      console.error('Error during registration:', err);
      res.status(500).json({ error: 'Erreur interne du serveur lors de l\'enregistrement' });
    }
  }

  /**
   * Connexion d'un utilisateur existant
   */
  static async login(req: Request, res: Response): Promise<any> {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ error: 'Veuillez saisir votre email et votre mot de passe' });
    }

    try {
      const query = 'SELECT * FROM utilisateurs WHERE email = $1';
      const result = await pool.query(query, [email]);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const user = result.rows[0];

      // Vérification scrypt
      const isMatch = await AuthService.verifyPassword(mot_de_passe, user.mot_de_passe);
      if (!isMatch) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const token = AuthService.generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      res.status(200).json({
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          nom: user.nom,
          email: user.email,
          role: user.role,
          is_subvented: user.is_subvented,
          ville_type: user.ville_type,
          budget_mensuel: user.budget_mensuel,
          email_verifie: user.email_verifie,
        }
      });
    } catch (err) {
      console.error('Error during login:', err);
      res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion' });
    }
  }

  /**
   * Demande de réinitialisation de mot de passe oublié
   */
  static async forgotPassword(req: Request, res: Response): Promise<any> {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Veuillez renseigner votre adresse email' });
    }

    try {
      const userRes = await pool.query('SELECT id, nom, email FROM utilisateurs WHERE email = $1', [email]);
      
      // OWASP Protection contre l'énumération des comptes : toujours retourner 200 même si l'email n'existe pas
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

        await pool.query(
          'UPDATE utilisateurs SET token_reset_password = $1, token_reset_expire = $2 WHERE id = $3',
          [resetToken, tokenExpire, user.id]
        );

        // Envoi asynchrone de l'email
        EmailService.sendPasswordResetEmail(user.email, user.nom, resetToken).catch((err) => {
          console.error('[AuthController] Erreur lors de l\'envoi de l\'email de reset:', err);
        });
      }

      return res.status(200).json({
        message: 'Si cette adresse email est associée à un compte, un lien de réinitialisation vous a été envoyé.'
      });
    } catch (err) {
      console.error('[AuthController] forgotPassword error:', err);
      return res.status(500).json({ error: 'Erreur serveur lors du traitement de la demande' });
    }
  }

  /**
   * Réinitialisation effective du mot de passe avec le token
   */
  static async resetPassword(req: Request, res: Response): Promise<any> {
    const { token, nouveau_mot_de_passe } = req.body;

    if (!token || !nouveau_mot_de_passe) {
      return res.status(400).json({ error: 'Jeton de sécurité et nouveau mot de passe requis' });
    }

    if (nouveau_mot_de_passe.length < 8) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
    }

    try {
      const result = await pool.query(
        `SELECT id, email, token_reset_expire 
         FROM utilisateurs 
         WHERE token_reset_password = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Ce lien de réinitialisation est invalide ou a déjà été utilisé.' });
      }

      const user = result.rows[0];
      const now = new Date();

      if (new Date(user.token_reset_expire) < now) {
        return res.status(400).json({ error: 'Ce lien de réinitialisation a expiré. Veuillez renouveler votre demande.' });
      }

      // Hachage du nouveau mot de passe
      const newPasswordHash = await AuthService.hashPassword(nouveau_mot_de_passe);

      // Mise à jour et révocation du jeton
      await pool.query(
        `UPDATE utilisateurs 
         SET mot_de_passe = $1, token_reset_password = NULL, token_reset_expire = NULL 
         WHERE id = $2`,
        [newPasswordHash, user.id]
      );

      // Notification in-app de sécurité
      NotificationService.creerNotification(
        user.id,
        '🔒 Mot de passe modifié',
        'Le mot de passe de votre compte a été modifié avec succès. Si vous n\'êtes pas à l\'origine de cette action, contactez le support.',
        'WARNING'
      ).catch(() => {});

      return res.status(200).json({
        message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
      });
    } catch (err) {
      console.error('[AuthController] resetPassword error:', err);
      return res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
    }
  }

  /**
   * Vérification / validation de l'adresse email
   */
  static async verifyEmail(req: Request, res: Response): Promise<any> {
    const token = (req.query.token as string) || req.body.token;

    if (!token) {
      return res.status(400).json({ error: 'Jeton de vérification requis' });
    }

    try {
      const result = await pool.query(
        `SELECT id, email, token_verification_expire 
         FROM utilisateurs 
         WHERE token_verification = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Jeton d\'activation invalide ou déjà confirmé' });
      }

      const user = result.rows[0];
      if (new Date(user.token_verification_expire) < new Date()) {
        return res.status(400).json({ error: 'Ce lien de confirmation a expiré. Veuillez en redemander un nouveau.' });
      }

      // Validation de l'email
      await pool.query(
        `UPDATE utilisateurs 
         SET email_verifie = true, token_verification = NULL, token_verification_expire = NULL 
         WHERE id = $1`,
        [user.id]
      );

      NotificationService.creerNotification(
        user.id,
        '✅ Email confirmé',
        'Votre adresse email a été validée avec succès. Vous disposez de toutes les fonctionnalités Leeral.',
        'SUCCESS'
      ).catch(() => {});

      return res.status(200).json({ message: 'Votre adresse email a été vérifiée avec succès !' });
    } catch (err) {
      console.error('[AuthController] verifyEmail error:', err);
      return res.status(500).json({ error: 'Erreur lors de la vérification de l\'email' });
    }
  }

  /**
   * Renvoi d'un lien de confirmation d'email
   */
  static async resendVerification(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    const email = req.body.email || userPayload?.email;

    if (!email) {
      return res.status(400).json({ error: 'Adresse email requise' });
    }

    try {
      const userRes = await pool.query('SELECT id, nom, email, email_verifie FROM utilisateurs WHERE email = $1', [email]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'Compte introuvable' });
      }

      const user = userRes.rows[0];
      if (user.email_verifie) {
        return res.status(400).json({ error: 'Cette adresse email est déjà vérifiée' });
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpire = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await pool.query(
        'UPDATE utilisateurs SET token_verification = $1, token_verification_expire = $2 WHERE id = $3',
        [verificationToken, tokenExpire, user.id]
      );

      await EmailService.sendVerificationEmail(user.email, user.nom, verificationToken);

      return res.status(200).json({ message: 'Un nouveau lien de vérification a été envoyé à votre adresse email.' });
    } catch (err) {
      console.error('[AuthController] resendVerification error:', err);
      return res.status(500).json({ error: 'Erreur lors du renvoi de la confirmation' });
    }
  }

  /**
   * Consultation du profil connecté
   */
  static async getProfile(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    if (!userPayload) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      const result = await pool.query(
        'SELECT id, nom, email, role, is_subvented, ville_type, budget_mensuel, email_verifie, cree_a FROM utilisateurs WHERE id = $1',
        [userPayload.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      res.status(200).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}
