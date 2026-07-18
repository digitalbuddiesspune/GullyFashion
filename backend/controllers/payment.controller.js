import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import { Address } from '../models/Address.js';
import User from '../models/User.js';
import {
  getAirpayConfig,
  generateUpiQrOrder,
  formatAmount,
  generateMerchantOrderId,
  verifySecureHash,
  verifyOrderWithAirpay,
} from '../utils/airpay.js';

const frontendBase = () => (process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/$/, '');

function mapCartItems(cart) {
  return cart.items.map((i) => {
    const p = i.product;
    let base = 0;
    if (p && typeof p.price === 'number') {
      base = Number(p.price) || 0;
    } else {
      const mrp = Number(p?.mrp) || 0;
      const discountPercent = Number(p?.discountPercent) || 0;
      base = Math.round(mrp - (mrp * discountPercent) / 100) || 0;
    }
    return { product: p._id, quantity: i.quantity, price: base, size: i.size || undefined };
  });
}

function calcPayable(subtotal) {
  const shippingCharge = subtotal < 5000 ? 99 : 0;
  const tax = Math.round(subtotal * 0.05);
  return subtotal + shippingCharge + tax;
}

async function loadShippingAddress(userId) {
  const addr = await Address.findOne({ userId });
  if (!addr) return null;
  const {
    fullName, mobileNumber, pincode, locality, address, city, state, landmark, alternatePhone, addressType,
  } = addr;
  return { fullName, mobileNumber, pincode, locality, address, city, state, landmark, alternatePhone, addressType };
}

function normalizeCallbackPayload(body = {}, query = {}) {
  const src = { ...query, ...body };
  // Flatten nested data if Airpay wraps response
  if (src.data && typeof src.data === 'object') {
    Object.assign(src, src.data);
  }
  return {
    orderid: src.orderid || src.TRANSACTIONID || src.transactionid,
    ap_transactionid: src.ap_transactionid || src.APTRANSACTIONID,
    amount: src.amount || src.AMOUNT,
    transaction_status: src.transaction_status || src.TRANSACTIONSTATUS,
    message: src.message || src.MESSAGE || '',
    merchant_id: src.merchant_id || src.MERCID || src.mercid,
    ap_SecureHash: src.ap_SecureHash || src.ap_securehash || src.AP_SECUREHASH,
    chmod: src.chmod || src.CHMOD,
    customer_vpa: src.customer_vpa || src.CUSTOMERVPA,
    transaction_payment_status:
      src.transaction_payment_status || src.TRANSACTIONPAYMENTSTATUS || '',
    customvar: src.customvar || src.CUSTOMVAR || '',
  };
}

async function finalizePaidOrder(order, apTransactionId) {
  if (order.paymentStatus === 'paid' || order.status === 'paid') {
    return order;
  }

  order.status = 'paid';
  order.paymentStatus = 'paid';
  order.orderStatus = 'confirmed';
  order.paymentMethod = 'airpay';
  order.transactionId = String(apTransactionId || order.transactionId || '');
  order.airpayTransactionId = String(apTransactionId || order.airpayTransactionId || '');
  await order.save();

  try {
    const cart = await Cart.findOne({ user: order.user });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
  } catch (err) {
    console.error('Airpay: failed to clear cart after payment', err?.message || err);
  }

  return order;
}

/** Initiate Airpay UPI QR payment — matches generateOrder PHP kit. */
export const createOrder = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const config = getAirpayConfig();
    if (!config) {
      return res.status(500).json({
        error: 'Airpay keys not configured. Set AIRPAY_MERCHANT_ID, AIRPAY_USERNAME, AIRPAY_PASSWORD, AIRPAY_SECRET (API key).',
      });
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const shippingAddress = await loadShippingAddress(userId);
    if (!shippingAddress) {
      return res.status(400).json({
        error: 'Shipping address is required. Please save your delivery address first.',
      });
    }

    const user = await User.findById(userId).lean();
    const items = mapCartItems(cart);
    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const amount = calcPayable(subtotal);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const airpayOrderId = generateMerchantOrderId();
    const order = await Order.create({
      user: userId,
      items,
      amount,
      currency: 'INR',
      status: 'pending',
      orderStatus: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'airpay',
      airpayOrderId,
      shippingAddress,
    });

    const buyerEmail = user?.email || `${userId}@gullyfashion.customer`;
    const buyerPhone = shippingAddress.mobileNumber || user?.phone || '9999999999';

    const qr = await generateUpiQrOrder(config, {
      orderid: airpayOrderId,
      amount,
      buyerPhone,
      buyerEmail,
      call_type: 'upiqr',
      // Keep empty so checksum matches official formula (tid + customvar as "")
      customvar: '',
    });

    if (qr.rid) {
      order.airpayTransactionId = String(qr.rid);
      await order.save();
    }

    return res.json({
      orderId: order._id,
      airpayOrderId,
      amount: formatAmount(amount),
      qrCodeString: qr.qrCodeString,
      rid: qr.rid,
      mid: qr.mid,
    });
  } catch (err) {
    console.error('Airpay createOrder error:', err?.message || err);
    if (err?.response?.data) console.error('Airpay API:', err.response.data);
    return res.status(500).json({ error: err?.message || 'Failed to create order' });
  }
};

/** Poll payment status after UPI QR scan. Also pulls status from Airpay when still pending. */
export const getPaymentStatus = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    let paid = order.paymentStatus === 'paid' || order.status === 'paid';

    if (!paid && order.airpayOrderId) {
      try {
        const config = getAirpayConfig();
        if (config) {
          const remote = await verifyOrderWithAirpay(config, {
            orderid: order.airpayOrderId,
            processor_id: order.airpayTransactionId || '',
          });
          const statusNum = Number(
            remote?.TRANSACTIONSTATUS ?? remote?.transaction_status ?? remote?.status
          );
          const paymentStatus = String(
            remote?.TRANSACTIONPAYMENTSTATUS ?? remote?.transaction_payment_status ?? ''
          ).toUpperCase();
          if (statusNum === 200 || paymentStatus === 'SUCCESS') {
            const apTxn =
              remote?.APTRANSACTIONID ||
              remote?.ap_transactionid ||
              order.airpayTransactionId;
            await finalizePaidOrder(order, apTxn);
            paid = true;
          }
        }
      } catch (err) {
        console.error('Airpay verify pull error:', err?.message || err);
      }
    }

    const fresh = await Order.findById(order._id);

    return res.json({
      orderId: fresh._id,
      airpayOrderId: fresh.airpayOrderId,
      paymentStatus: fresh.paymentStatus,
      status: fresh.status,
      paid: fresh.paymentStatus === 'paid' || fresh.status === 'paid' || paid,
    });
  } catch (err) {
    console.error('getPaymentStatus error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch payment status' });
  }
};

/** Browser return URL after Airpay checkout (success / failure). */
export const paymentCallback = async (req, res) => {
  const frontend = frontendBase();
  try {
    const config = getAirpayConfig();
    if (!config) {
      return res.redirect(`${frontend}/address?payment=failed&reason=config`);
    }

    const payload = normalizeCallbackPayload(req.body, req.query);
    const orderid = payload.orderid;
    if (!orderid) {
      return res.redirect(`${frontend}/address?payment=failed&reason=missing_order`);
    }

    const order = await Order.findOne({ airpayOrderId: orderid });
    if (!order) {
      return res.redirect(`${frontend}/address?payment=failed&reason=order_not_found`);
    }

    const statusNum = Number(payload.transaction_status);
    const isSuccess =
      statusNum === 200 ||
      String(payload.transaction_payment_status).toUpperCase() === 'SUCCESS';

    if (!isSuccess) {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      await order.save();
      return res.redirect(`${frontend}/address?payment=failed&reason=declined`);
    }

    if (!verifySecureHash(payload, config.username, config.mercid)) {
      console.error('Airpay callback: invalid secure hash for', orderid);
      return res.redirect(`${frontend}/address?payment=failed&reason=hash`);
    }

    await finalizePaidOrder(order, payload.ap_transactionid);
    return res.redirect(
      `${frontend}/order/success?orderId=${encodeURIComponent(String(order._id))}&payment=airpay`
    );
  } catch (err) {
    console.error('Airpay paymentCallback error:', err?.message || err);
    return res.redirect(`${frontend}/address?payment=failed&reason=server`);
  }
};

/** Server-to-server IPN from Airpay. */
export const paymentIpn = async (req, res) => {
  try {
    const config = getAirpayConfig();
    if (!config) return res.status(500).json({ error: 'Airpay not configured' });

    const payload = normalizeCallbackPayload(req.body, req.query);
    const orderid = payload.orderid;
    if (!orderid) return res.status(400).json({ error: 'Missing orderid' });

    if (!verifySecureHash(payload, config.username, config.mercid)) {
      console.error('Airpay IPN: invalid secure hash for', orderid);
      return res.status(400).json({ error: 'Invalid hash' });
    }

    const order = await Order.findOne({ airpayOrderId: orderid });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const statusNum = Number(payload.transaction_status);
    const isSuccess =
      statusNum === 200 ||
      String(payload.transaction_payment_status).toUpperCase() === 'SUCCESS';

    if (isSuccess) {
      await finalizePaidOrder(order, payload.ap_transactionid);
    } else if (statusNum === 400 || statusNum === 405) {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      await order.save();
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Airpay IPN error:', err?.message || err);
    return res.status(500).json({ error: 'IPN processing failed' });
  }
};

/** Kept for older clients — prefer callback/IPN for Airpay. */
export const verifyPayment = async (req, res) => {
  try {
    const config = getAirpayConfig();
    if (!config) return res.status(500).json({ error: 'Airpay not configured' });

    const payload = normalizeCallbackPayload(req.body);
    if (!payload.orderid || !payload.ap_transactionid || !payload.ap_SecureHash) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (!verifySecureHash(payload, config.username, config.mercid)) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    const order = await Order.findOne({ airpayOrderId: payload.orderid });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const statusNum = Number(payload.transaction_status);
    const isSuccess =
      statusNum === 200 ||
      String(payload.transaction_payment_status).toUpperCase() === 'SUCCESS';

    if (!isSuccess) {
      return res.status(400).json({ success: false, error: 'Payment not successful' });
    }

    await finalizePaidOrder(order, payload.ap_transactionid);
    return res.json({ success: true, order });
  } catch (err) {
    console.error('Airpay verifyPayment error:', err?.message || err);
    return res.status(500).json({ error: 'Verification failed' });
  }
};

export const createCODOrder = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      console.error('COD Order: No userId found');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      console.error('COD Order: Cart is empty for user', userId);
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const items = mapCartItems(cart);
    const amount = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

    let shippingAddress = null;
    try {
      shippingAddress = await loadShippingAddress(userId);
      if (!shippingAddress) {
        console.error('COD Order: No address found for user', userId);
      }
    } catch (addrErr) {
      console.error('COD Order: Error fetching address:', addrErr?.message || addrErr);
    }

    if (!shippingAddress) {
      return res.status(400).json({
        error: 'Shipping address is required. Please save your delivery address first.',
      });
    }

    const order = await Order.create({
      user: userId,
      items,
      amount,
      currency: 'INR',
      status: 'pending',
      paymentMethod: 'cod',
      shippingAddress,
    });

    cart.items = [];
    await cart.save();

    console.log('COD Order created successfully:', order._id);
    return res.json({ success: true, order });
  } catch (err) {
    console.error('Create COD order error:', err?.message || err);
    console.error('Stack:', err?.stack);
    return res.status(500).json({ error: err?.message || 'Failed to create COD order' });
  }
};
