import { Request, Response } from 'express';
import { NotificationService } from '../services/notification';

export class NotificationController {
  /**
   * Récupère la liste des notifications de l'utilisateur connecté
   */
  static async getNotifications(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    if (!userPayload?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unread === 'true';

      const data = await NotificationService.getNotifications(userPayload.id, limit, offset, unreadOnly);
      return res.status(200).json(data);
    } catch (err: any) {
      console.error('[NotificationController] getNotifications error:', err);
      return res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
    }
  }

  /**
   * Récupère le compteur de notifications non lues
   */
  static async getUnreadCount(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    if (!userPayload?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      const count = await NotificationService.getUnreadCount(userPayload.id);
      return res.status(200).json({ unread_count: count });
    } catch (err: any) {
      console.error('[NotificationController] getUnreadCount error:', err);
      return res.status(500).json({ error: 'Erreur lors du calcul des notifications non lues' });
    }
  }

  /**
   * Marque une notification spécifique comme lue
   */
  static async markAsRead(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    const { id } = req.params;

    if (!userPayload?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      const success = await NotificationService.marquerCommeLu(id as string, userPayload.id);
      if (!success) {
        return res.status(404).json({ error: 'Notification introuvable ou déjà lue' });
      }
      return res.status(200).json({ message: 'Notification marquée comme lue' });
    } catch (err: any) {
      console.error('[NotificationController] markAsRead error:', err);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  }

  /**
   * Marque toutes les notifications comme lues
   */
  static async markAllAsRead(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;

    if (!userPayload?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      const updatedCount = await NotificationService.marquerToutCommeLu(userPayload.id);
      return res.status(200).json({ 
        message: 'Toutes les notifications ont été marquées comme lues',
        updated_count: updatedCount 
      });
    } catch (err: any) {
      console.error('[NotificationController] markAllAsRead error:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  /**
   * Supprime une notification
   */
  static async deleteNotification(req: Request, res: Response): Promise<any> {
    const userPayload = (req as any).user;
    const { id } = req.params;

    if (!userPayload?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      const success = await NotificationService.supprimerNotification(id as string, userPayload.id);
      if (!success) {
        return res.status(404).json({ error: 'Notification introuvable' });
      }
      return res.status(200).json({ message: 'Notification supprimée' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  }
}
