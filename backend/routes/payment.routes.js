import { Router } from 'express';
import {
  createOrder,
  verifyPayment,
  createCODOrder,
  paymentCallback,
  paymentIpn,
  getPaymentStatus,
} from '../controllers/payment.controller.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/orders', auth, createOrder);
router.get('/status/:orderId', auth, getPaymentStatus);
router.post('/verify', auth, verifyPayment);
router.post('/cod', auth, createCODOrder);

// Airpay browser return + server IPN (no auth — Airpay calls these)
router.post('/callback', paymentCallback);
router.get('/callback', paymentCallback);
router.post('/ipn', paymentIpn);
router.get('/ipn', paymentIpn);

export default router;
