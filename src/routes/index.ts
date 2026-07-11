import { Router } from 'express';
import { AuthController } from '../controllers/auth';
import { FacturationController } from '../controllers/facturation';
import { AdminController } from '../controllers/admin';
import { authMiddleware, restrictTo } from '../middlewares/auth';

const router = Router();

// --- AUTH ROUTES ---
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/profile', authMiddleware, AuthController.getProfile);

// --- BILLING / FACTURATION ROUTES ---
router.post('/facturation/senelec', authMiddleware, FacturationController.handleSenelecCalculation);
router.post('/facturation/seneau', authMiddleware, FacturationController.handleSeneauCalculation);
router.get('/facturation/history', authMiddleware, FacturationController.getHistory);
router.put('/facturation/pay/:id', authMiddleware, FacturationController.payWaterBill);

// --- ADMINISTRATION ROUTES ---
router.get('/admin/utilisateurs', authMiddleware, restrictTo('ADMIN'), AdminController.getUsers);
router.put('/admin/utilisateurs/:id', authMiddleware, restrictTo('ADMIN'), AdminController.updateUser);
router.delete('/admin/utilisateurs/:id', authMiddleware, restrictTo('ADMIN'), AdminController.deleteUser);

router.get('/admin/tarifs', authMiddleware, restrictTo('ADMIN'), AdminController.getTariffs);
router.post('/admin/tarifs', authMiddleware, restrictTo('ADMIN'), AdminController.createTariff);
router.put('/admin/tarifs/:id', authMiddleware, restrictTo('ADMIN'), AdminController.updateTariff);

router.get('/admin/audit/rapport-annuel', authMiddleware, restrictTo('ADMIN'), AdminController.getAuditReport);

export default router;
