import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthService } from '../services/auth';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<any> {
    const { nom, email, mot_de_passe, role, is_subvented, ville_type } = req.body;

    // Simple validation
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({ error: 'Champs requis manquants (nom, email, mot_de_passe)' });
    }

    if (mot_de_passe.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format de l\'adresse email invalide' });
    }

    try {
      // Check if email already exists
      const checkEmail = await pool.query('SELECT id FROM utilisateurs WHERE email = $1', [email]);
      if (checkEmail.rows.length > 0) {
        return res.status(409).json({ error: 'Cette adresse email est déjà enregistrée' });
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(mot_de_passe);
      
      // Determine values
      const userRole = role === 'ADMIN' ? 'ADMIN' : 'CLIENT';
      const subvented = is_subvented === true;
      const vType = ville_type === 'ASSAINIE' ? 'ASSAINIE' : 'NON_ASSAINIE';

      // Insert into DB
      const insertQuery = `
        INSERT INTO utilisateurs (nom, email, mot_de_passe, role, is_subvented, ville_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nom, email, role, is_subvented, ville_type, cree_a
      `;
      const result = await pool.query(insertQuery, [nom, email, passwordHash, userRole, subvented, vType]);
      const newUser = result.rows[0];

      // Generate token
      const token = AuthService.generateToken(newUser);

      res.status(211).json({
        message: 'Utilisateur enregistré avec succès',
        token,
        user: {
          id: newUser.id,
          nom: newUser.nom,
          email: newUser.email,
          role: newUser.role,
          is_subvented: newUser.is_subvented,
          ville_type: newUser.ville_type,
        }
      });
    } catch (err: any) {
      console.error('Error during registration:', err);
      res.status(500).json({ error: 'Erreur interne du serveur lors de l\'enregistrement' });
    }
  }

  /**
   * Login an existing user
   */
  static async login(req: Request, res: Response): Promise<any> {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ error: 'Veuillez saisir votre email et votre mot de passe' });
    }

    try {
      // Find user
      const query = 'SELECT * FROM utilisateurs WHERE email = $1';
      const result = await pool.query(query, [email]);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const user = result.rows[0];

      // Verify password
      const isMatch = await AuthService.verifyPassword(mot_de_passe, user.mot_de_passe);
      if (!isMatch) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      // Generate token
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
        }
      });
    } catch (err) {
      console.error('Error during login:', err);
      res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion' });
    }
  }

  /**
   * Get current authenticated user profile details
   */
  static async getProfile(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    if (!userPayload) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      const result = await pool.query(
        'SELECT id, nom, email, role, is_subvented, ville_type, cree_a FROM utilisateurs WHERE id = $1',
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
