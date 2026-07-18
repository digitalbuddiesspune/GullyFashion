import crypto from 'crypto';
import axios from 'axios';

const GENERATE_ORDER_URL = 'https://kraken.airpay.co.in/airpay/api/generateOrder';

/**
 * Credentials from the Airpay generateOrder (v3) kit:
 *   username, password, secret (API key), mercid
 */
export function getAirpayConfig() {
  const mercid = (process.env.AIRPAY_MERCHANT_ID || '').trim();
  const username = (process.env.AIRPAY_USERNAME || '').trim();
  const password = (process.env.AIRPAY_PASSWORD || '').trim();
  // API key — matches PHP: $secret = ''; // API key
  const secret = (process.env.AIRPAY_SECRET || process.env.AIRPAY_CLIENT_SECRET || '').trim();

  if (!mercid || !username || !password || !secret) {
    return null;
  }

  // PHP: $key256 = hash('SHA256', $username."~:~".$password);
  const key256 = crypto.createHash('sha256').update(`${username}~:~${password}`).digest('hex');
  // PHP: $encKey = md5($secret);
  const encKey = crypto.createHash('md5').update(secret).digest('hex');

  return { mercid, username, password, secret, key256, encKey };
}

function todayYmd() {
  // Airpay servers use IST — must match PHP date('Y-m-d') in India
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** AES-256-CBC — matches PHP openssl_encrypt with IV hex prefix. */
export function encrypt(jsonData, encKey) {
  const iv = crypto.randomBytes(8).toString('hex'); // 16 chars
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encKey, 'utf8'), Buffer.from(iv, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(String(jsonData), 'utf8'), cipher.final()]);
  return iv + encrypted.toString('base64');
}

/** Decrypt Airpay response — matches PHP sample. */
export function decrypt(encryptedData, encKey) {
  if (!encryptedData || typeof encryptedData !== 'string') return null;
  const iv = encryptedData.slice(0, 16);
  const data = encryptedData.slice(16);
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(encKey, 'utf8'),
    Buffer.from(iv, 'utf8')
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * Official Airpay v3 checksum:
 *   key256  = hash('SHA256', username."~:~".password)
 *   alldata = mercid.orderid.amount.tid.buyerPhone.buyerEmail.mer_dom.customvar.call_type
 *   checksum = hash('SHA256', key256.'@'.alldata.date('Y-m-d'))
 *
 * Empty optional fields (tid, customvar) must still be concatenated as "".
 *
 * Also supports the shorter PHP-kit variant (no tid/customvar) via `variant: 'php'`.
 */
export function buildGenerateOrderChecksum(config, {
  mercid,
  orderid,
  amount,
  tid = '',
  buyerPhone,
  buyerEmail,
  mer_dom,
  customvar = '',
  call_type,
  variant = 'docs',
}) {
  const alldata =
    variant === 'php'
      ? `${mercid}${orderid}${amount}${buyerPhone}${buyerEmail}${mer_dom}${call_type}`
      : `${mercid}${orderid}${amount}${tid}${buyerPhone}${buyerEmail}${mer_dom}${customvar}${call_type}`;
  return crypto
    .createHash('sha256')
    .update(`${config.key256}@${alldata}${todayYmd()}`)
    .digest('hex');
}

export function formatAmount(rupees) {
  return Number(rupees).toFixed(2);
}

export function generateMerchantOrderId() {
  return `GF${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
}

export function getMerchantDomainBase64() {
  // Must match the domain whitelisted in Airpay (PHP sample used http://localhost)
  const domain =
    process.env.AIRPAY_MERCHANT_DOMAIN ||
    'http://localhost';
  return Buffer.from(String(domain).trim().replace(/\/$/, ''), 'utf8').toString('base64');
}

async function postGenerateOrder(postBody) {
  const { data: response } = await axios.post(GENERATE_ORDER_URL, postBody, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
    validateStatus: () => true,
  });
  return response;
}

function isWrongChecksum(response) {
  const msg = String(response?.message || response?.error || response?.status || '').toLowerCase();
  return msg.includes('wrong checksum') || msg.includes('invalid checksum') || msg.includes('checksum');
}

/**
 * Call Airpay generateOrder (UPI QR) — mirrors the official v3 kit.
 */
export async function generateUpiQrOrder(config, {
  orderid,
  amount,
  buyerPhone,
  buyerEmail,
  call_type = 'upiqr',
  customvar = '',
  tid = '',
}) {
  const mercid = String(config.mercid).trim();
  const amt = formatAmount(amount);
  const phone = String(buyerPhone).replace(/\D/g, '').slice(-10);
  const email = String(buyerEmail).trim();
  const mer_dom = getMerchantDomainBase64();
  const tidVal = String(tid || '');
  const customVal = String(customvar || '');

  // mercid as number in JSON (Airpay docs type it as int)
  const mercidNum = Number(mercid);
  const mercidForJson = Number.isFinite(mercidNum) ? mercidNum : mercid;

  // Include optional keys as empty strings so decrypted payload matches checksum formula
  const fieldsDocs = {
    mercid: mercidForJson,
    orderid: String(orderid),
    amount: amt,
    tid: tidVal,
    buyerPhone: phone,
    buyerEmail: email,
    mer_dom,
    customvar: customVal,
    call_type,
  };

  // PHP sample fields (no tid / customvar)
  const fieldsPhp = {
    mercid: mercidForJson,
    orderid: String(orderid),
    amount: amt,
    buyerPhone: phone,
    buyerEmail: email,
    mer_dom,
    call_type,
  };

  const attempts = [
    { variant: 'docs', fields: fieldsDocs },
    { variant: 'php', fields: fieldsPhp },
  ];

  let lastError = null;
  let lastResponse = null;

  for (const attempt of attempts) {
    const checksum = buildGenerateOrderChecksum(config, {
      mercid,
      orderid: String(orderid),
      amount: amt,
      tid: tidVal,
      buyerPhone: phone,
      buyerEmail: email,
      mer_dom,
      customvar: customVal,
      call_type,
      variant: attempt.variant,
    });

    const encData = encrypt(JSON.stringify(attempt.fields), config.encKey);
    const postBody = { encData, checksum, mercid };

    console.log('Airpay generateOrder attempt:', {
      variant: attempt.variant,
      date: todayYmd(),
      mercid,
      orderid: String(orderid),
      amount: amt,
      phone,
      email,
      call_type,
      mer_dom_len: mer_dom.length,
      checksum_prefix: checksum.slice(0, 8),
    });

    const response = await postGenerateOrder(postBody);
    lastResponse = response;

    if (!response) {
      lastError = new Error('Empty response from Airpay generateOrder');
      continue;
    }

    const encryptedData = response.data;
    if (encryptedData && typeof encryptedData === 'string') {
      let decrypted;
      try {
        decrypted = decrypt(encryptedData, config.encKey);
      } catch (err) {
        console.error('Airpay decrypt failed:', err?.message || err);
        throw new Error('Failed to decrypt Airpay response — check AIRPAY_SECRET (API key)');
      }

      let parsed;
      try {
        parsed = JSON.parse(decrypted);
      } catch {
        console.error('Airpay decrypted non-JSON:', decrypted);
        throw new Error('Invalid Airpay response payload');
      }

      if (Number(parsed.status) !== 200 && !parsed.QRCODE_STRING) {
        throw new Error(parsed.message || `Airpay order failed (status ${parsed.status})`);
      }

      return {
        qrCodeString: parsed.QRCODE_STRING,
        mid: parsed.MID,
        rid: parsed.RID,
        status: parsed.status,
        raw: parsed,
      };
    }

    const errMsg = response.message || response.error || 'Airpay generateOrder failed';
    lastError = new Error(errMsg);
    console.error('Airpay generateOrder failed:', attempt.variant, response);

    // Only retry alternate checksum if this one was a checksum error
    if (!isWrongChecksum(response)) break;
  }

  console.error('Airpay generateOrder unexpected response:', lastResponse);
  throw lastError || new Error('Airpay did not return encrypted order data');
}

/**
 * Pull transaction status from Airpay v3 verify API.
 * POST https://kraken.airpay.co.in/airpay/order/verify.php
 */
export async function verifyOrderWithAirpay(config, { orderid, processor_id = '' }) {
  const private_key = crypto
    .createHash('sha256')
    .update(`${config.secret}@${config.username}:|:${config.password}`)
    .digest('hex');

  const merchant_id = String(config.mercid);
  const merchant_txn_id = String(orderid || '');
  const processorId = String(processor_id || '');
  const rrn = '';
  const terminal_id = '';
  const txn_type = '';
  const date = todayYmd();

  // alldata = merchant_id.merchant_txn_id.processor_id.rrn.terminal_id.txn_type.date
  const alldata = `${merchant_id}${merchant_txn_id}${processorId}${rrn}${terminal_id}${txn_type}${date}`;
  const checksum = crypto.createHash('sha256').update(`${config.key256}@${alldata}`).digest('hex');

  const body = new URLSearchParams({
    merchant_id,
    merchant_txn_id,
    private_key,
    checksum,
  });
  if (processorId) body.append('processor_id', processorId);

  const { data } = await axios.post('https://kraken.airpay.co.in/airpay/order/verify.php', body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
    validateStatus: () => true,
  });

  // Response may be XML or JSON depending on Airpay version
  if (!data) return null;

  if (typeof data === 'object') {
    return data;
  }

  const text = String(data);
  const pick = (tag) => {
    const m = text.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`, 'i'))
      || text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 'i'));
    return m ? m[1] : '';
  };

  return {
    TRANSACTIONSTATUS: pick('TRANSACTIONSTATUS'),
    APTRANSACTIONID: pick('APTRANSACTIONID'),
    TRANSACTIONID: pick('TRANSACTIONID'),
    AMOUNT: pick('AMOUNT'),
    MESSAGE: pick('MESSAGE'),
  };
}

/** PHP-compatible unsigned CRC32 string (for IPN / callback hash). */
export function crc32Unsigned(str) {
  let crc = 0xffffffff;
  const buf = Buffer.from(String(str), 'utf8');
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString();
}

/**
 * Verify Airpay ap_SecureHash on IPN/callback.
 * crc32(TRANSACTIONID:APTRANSACTIONID:AMOUNT:TRANSACTIONSTATUS:MESSAGE:MID:USERNAME[:CUSTOMERVPA])
 */
export function verifySecureHash(payload, username, merchantId) {
  const orderid = String(payload.orderid ?? payload.TRANSACTIONID ?? '');
  const apTxn = String(payload.ap_transactionid ?? payload.APTRANSACTIONID ?? '');
  const amountStr = String(payload.amount ?? payload.AMOUNT ?? '');
  const status = String(payload.transaction_status ?? payload.TRANSACTIONSTATUS ?? '');
  const message = String(payload.message ?? payload.MESSAGE ?? '');
  const mid = String(payload.merchant_id ?? payload.MERCID ?? merchantId ?? '');
  const received = String(payload.ap_SecureHash ?? payload.ap_securehash ?? '');
  const chmod = String(payload.chmod ?? payload.CHMOD ?? '').toLowerCase();
  const vpa = String(payload.customer_vpa ?? payload.CUSTOMERVPA ?? '');

  if (!received) return false;

  let base = `${orderid}:${apTxn}:${amountStr}:${status}:${message}:${mid}:${username}`;
  if (chmod === 'upi' && vpa) base += `:${vpa}`;

  return crc32Unsigned(base) === received;
}
