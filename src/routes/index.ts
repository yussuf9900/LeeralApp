import { Router } from 'express';
import { AuthController } from '../controllers/auth';
import { FacturationController } from '../controllers/facturation';
import { AdminController } from '../controllers/admin';
import { DashboardController } from '../controllers/dashboard';
import { CompteurController } from '../controllers/compteur';
import { authMiddleware, restrictTo } from '../middlewares/auth';

const router = Router();

// --- AUTH ROUTES ---
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/profile', authMiddleware, AuthController.getProfile);

// --- DASHBOARD ROUTES ---
router.get('/dashboard/stats', authMiddleware, DashboardController.getStats);
router.put('/dashboard/budget', authMiddleware, DashboardController.updateBudget);

// --- METERS / COMPTEURS ROUTES ---
router.get('/compteurs', authMiddleware, CompteurController.getMeters);
router.post('/compteurs', authMiddleware, CompteurController.createMeter);
router.delete('/compteurs/:id', authMiddleware, CompteurController.deleteMeter);

// --- BILLING / FACTURATION ROUTES ---
router.post('/facturation/senelec', authMiddleware, FacturationController.handleSenelecCalculation);
router.post('/facturation/seneau', authMiddleware, FacturationController.handleSeneauCalculation);
router.get('/facturation/history', authMiddleware, FacturationController.getHistory);
router.put('/facturation/pay/:id', authMiddleware, FacturationController.payWaterBill);

// --- ADMINISTRATION ROUTES ---
router.get('/admin/utilisateurs', authMiddleware, restrictTo('ADMIN'), AdminController.getUsers);
router.put('/admin/utilisateurs/:id', authMiddleware, AdminController.updateUser);
router.delete('/admin/utilisateurs/:id', authMiddleware, restrictTo('ADMIN'), AdminController.deleteUser);

router.get('/admin/tarifs', authMiddleware, restrictTo('ADMIN'), AdminController.getTariffs);
router.post('/admin/tarifs', authMiddleware, restrictTo('ADMIN'), AdminController.createTariff);
router.put('/admin/tarifs/:id', authMiddleware, restrictTo('ADMIN'), AdminController.updateTariff);

router.get('/admin/configurations', authMiddleware, restrictTo('ADMIN'), AdminController.getConfigurations);
router.put('/admin/configurations/:cle', authMiddleware, restrictTo('ADMIN'), AdminController.updateConfiguration);

router.get('/admin/audit/rapport-annuel', authMiddleware, restrictTo('ADMIN'), AdminController.getAuditReport);

export default router;

