import pool from '../config/database';

export type NotificationType = 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';

export interface NotificationItem {
  id: string;
  utilisateur_id: string;
  titre: string;
  message: string;
  type: NotificationType;
  lien?: string;
  lu: boolean;
  cree_a: string;
}

export class NotificationService {
  /**
   * Crée une nouvelle notification pour un utilisateur
   */
  static async creerNotification(
    userId: string,
    titre: string,
    message: string,
    type: NotificationType = 'INFO',
    lien?: string
  ): Promise<NotificationItem> {
    const query = `
      INSERT INTO notifications (utilisateur_id, titre, message, type, lien)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, utilisateur_id, titre, message, type, lien, lu, cree_a
    `;
    const result = await pool.query(query, [userId, titre, message, type, lien || null]);
    return result.rows[0];
  }

  /**
   * Récupère la liste des notifications paginée
   */
  static async getNotifications(
    userId: string,
    limit: number = 30,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{ notifications: NotificationItem[]; total: number; unread_count: number }> {
    let query = `
      SELECT id, utilisateur_id, titre, message, type, lien, lu, cree_a
      FROM notifications
      WHERE utilisateur_id = $1
    `;
    const params: any[] = [userId];

    if (unreadOnly) {
      query += ' AND lu = false';
    }

    query += ' ORDER BY cree_a DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get unread count
    const unreadCountRes = await pool.query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE utilisateur_id = $1 AND lu = false',
      [userId]
    );

    const totalRes = await pool.query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE utilisateur_id = $1',
      [userId]
    );

    return {
      notifications: result.rows,
      total: totalRes.rows[0]?.count || 0,
      unread_count: unreadCountRes.rows[0]?.count || 0,
    };
  }

  /**
   * Retourne uniquement le nombre de notifications non lues
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const res = await pool.query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE utilisateur_id = $1 AND lu = false',
      [userId]
    );
    return res.rows[0]?.count || 0;
  }

  /**
   * Marque une notification spécifique comme lue
   */
  static async marquerCommeLu(id: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE notifications 
      SET lu = true 
      WHERE id = $1 AND utilisateur_id = $2
      RETURNING id
    `;
    const res = await pool.query(query, [id, userId]);
    return res.rowCount !== null && res.rowCount > 0;
  }

  /**
   * Marque toutes les notifications d'un utilisateur comme lues
   */
  static async marquerToutCommeLu(userId: string): Promise<number> {
    const query = `
      UPDATE notifications 
      SET lu = true 
      WHERE utilisateur_id = $1 AND lu = false
    `;
    const res = await pool.query(query, [userId]);
    return res.rowCount || 0;
  }

  /**
   * Supprime une notification
   */
  static async supprimerNotification(id: string, userId: string): Promise<boolean> {
    const res = await pool.query('DELETE FROM notifications WHERE id = $1 AND utilisateur_id = $2', [id, userId]);
    return res.rowCount !== null && res.rowCount > 0;
  }

  /**
   * Analyse la situation de facturation et déclenche automatiquement les alertes pertinentes
   */
  static async verifierEtDeclencherAlertes(
    userId: string,
    options: {
      service: string;
      montant: number;
      consommation?: number;
      cumulMensuelKwh?: number;
    }
  ): Promise<void> {
    try {
      // 1. Récupération des paramètres utilisateur (budget mensuel)
      const userRes = await pool.query('SELECT budget_mensuel FROM utilisateurs WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return;

      const budgetMensuel = parseFloat(userRes.rows[0].budget_mensuel || '0');

      // 2. Vérification du budget mensuel si configuré
      if (budgetMensuel > 0) {
        // Calcul du montant total cumulé ce mois-ci
        const currentMonthTotalRes = await pool.query(
          `SELECT COALESCE(SUM(montant_ttc), 0)::numeric as total
           FROM factures
           WHERE utilisateur_id = $1
             AND DATE_TRUNC('month', cree_a) = DATE_TRUNC('month', CURRENT_DATE)`,
          [userId]
        );
        const totalCumule = parseFloat(currentMonthTotalRes.rows[0]?.total || '0') + options.montant;

        // Dépassé 100%
        if (totalCumule >= budgetMensuel) {
          // Éviter de spammer si une alerte identique a déjà été émise aujourd'hui
          const checkRecent = await pool.query(
            `SELECT id FROM notifications 
             WHERE utilisateur_id = $1 
               AND type = 'DANGER' 
               AND titre LIKE '%Dépassement du budget%'
               AND cree_a >= NOW() - INTERVAL '24 hours'`,
            [userId]
          );
          if (checkRecent.rows.length === 0) {
            await this.creerNotification(
              userId,
              '⚠️ Dépassement du budget mensuel',
              `Vos dépenses énergétiques atteignent ${Math.round(totalCumule).toLocaleString('fr-FR')} FCFA pour un budget fixé à ${Math.round(budgetMensuel).toLocaleString('fr-FR')} FCFA.`,
              'DANGER',
              'dashboard'
            );
          }
        } else if (totalCumule >= 0.8 * budgetMensuel) {
          // Dépassé 80%
          const checkRecent = await pool.query(
            `SELECT id FROM notifications 
             WHERE utilisateur_id = $1 
               AND type = 'WARNING' 
               AND titre LIKE '%Alerte Budget (80%)%'
               AND cree_a >= NOW() - INTERVAL '24 hours'`,
            [userId]
          );
          if (checkRecent.rows.length === 0) {
            await this.creerNotification(
              userId,
              '⚡ Alerte Budget (80% atteint)',
              `Vous avez consommé plus de 80% de votre budget mensuel (${Math.round(totalCumule).toLocaleString('fr-FR')} / ${Math.round(budgetMensuel).toLocaleString('fr-FR')} FCFA).`,
              'WARNING',
              'dashboard'
            );
          }
        }
      }

      // 3. Vérification des alertes réglementaires Senelec (Tranches & TVA)
      if (options.service.toUpperCase().includes('SENELEC')) {
        const cumulKwh = options.cumulMensuelKwh || options.consommation || 0;

        // Basculement Tranche 2 (> 150 kWh)
        if (cumulKwh > 150 && cumulKwh <= 250) {
          const checkRecent = await pool.query(
            `SELECT id FROM notifications 
             WHERE utilisateur_id = $1 
               AND titre LIKE '%Tranche 2 Senelec%'
               AND cree_a >= NOW() - INTERVAL '7 days'`,
            [userId]
          );
          if (checkRecent.rows.length === 0) {
            await this.creerNotification(
              userId,
              '📈 Basculement en Tranche 2 Senelec',
              `Votre cumul mensuel (${Math.round(cumulKwh)} kWh) dépasse 150 kWh. Les kWh supplémentaires sont désormais facturés au tarif Tranche 2 (136.49 FCFA/kWh).`,
              'WARNING',
              'simulator'
            );
          }
        }

        // Seuil pivot TVA 250 kWh (> 250 kWh)
        if (cumulKwh > 250) {
          const checkRecent = await pool.query(
            `SELECT id FROM notifications 
             WHERE utilisateur_id = $1 
               AND titre LIKE '%Seuil TVA 18%%'
               AND cree_a >= NOW() - INTERVAL '7 days'`,
            [userId]
          );
          if (checkRecent.rows.length === 0) {
            await this.creerNotification(
              userId,
              '⚖️ Seuil TVA 18% atteint (CRSE)',
              `Votre consommation a dépassé le seuil pivot réglementaire de 250 kWh. La TVA à 18% s'applique légalement sur la tranche supérieure.`,
              'DANGER',
              'simulator'
            );
          }
        }
      }
    } catch (err) {
      console.error('[NotificationService] Erreur lors de la vérification des alertes:', err);
    }
  }
}
