const crypto = require('crypto');
const dns = require('dns');

// Force Node.js DNS to prefer IPv4 over IPv6 for all outbound Easebuzz gateway API requests
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {}

class EasebuzzService {
  constructor() {
    this.key = process.env.EASEBUZZ_KEY || process.env.EASEBUZZ_MERCHANT_KEY || '';
    this.salt = process.env.EASEBUZZ_SALT || '';
    this.env = (process.env.EASEBUZZ_ENV || 'prod').toLowerCase();
    this.baseUrl = this.env === 'test' 
      ? 'https://testpay.easebuzz.in' 
      : 'https://pay.easebuzz.in';
  }

  getCredentials() {
    return {
      key: process.env.EASEBUZZ_KEY || process.env.EASEBUZZ_MERCHANT_KEY || this.key,
      salt: process.env.EASEBUZZ_SALT || this.salt,
      env: (process.env.EASEBUZZ_ENV || this.env || 'prod').toLowerCase(),
      baseUrl: (process.env.EASEBUZZ_ENV || this.env || 'prod').toLowerCase() === 'test'
        ? 'https://testpay.easebuzz.in'
        : 'https://pay.easebuzz.in'
    };
  }

  /**
   * Generate SHA-512 Hash for Easebuzz Initiate Payment
   * Formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
   */
  generateInitiateHash(params) {
    const { key, salt } = this.getCredentials();
    const {
      txnid = '',
      amount = '',
      productinfo = '',
      firstname = '',
      email = '',
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      udf6 = '',
      udf7 = '',
      udf8 = '',
      udf9 = '',
      udf10 = ''
    } = params;

    const hashString = [
      (key || '').trim(),
      (txnid || '').toString().trim(),
      (amount || '').toString().trim(),
      (productinfo || '').toString().trim(),
      (firstname || '').toString().trim(),
      (email || '').toString().trim(),
      (udf1 || '').toString().trim(),
      (udf2 || '').toString().trim(),
      (udf3 || '').toString().trim(),
      (udf4 || '').toString().trim(),
      (udf5 || '').toString().trim(),
      (udf6 || '').toString().trim(),
      (udf7 || '').toString().trim(),
      (udf8 || '').toString().trim(),
      (udf9 || '').toString().trim(),
      (udf10 || '').toString().trim(),
      (salt || '').trim()
    ].join('|');

    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  /**
   * Verify SHA-512 Hash for Easebuzz Response
   * Formula: salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
   */
  verifyResponseHash(body) {
    const { key, salt } = this.getCredentials();
    const {
      status = '',
      txnid = '',
      amount = '',
      productinfo = '',
      firstname = '',
      email = '',
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      udf6 = '',
      udf7 = '',
      udf8 = '',
      udf9 = '',
      udf10 = '',
      hash = ''
    } = body;

    const receivedHash = (hash || '').trim().toLowerCase();
    if (!receivedHash) return { isValid: false, calculatedHash: '', receivedHash: '' };

    const amountStrRaw = (amount || '').toString().trim();
    const amountFixed2 = !isNaN(parseFloat(amount)) ? parseFloat(amount).toFixed(2) : amountStrRaw;
    const amountFixed1 = !isNaN(parseFloat(amount)) ? parseFloat(amount).toFixed(1) : amountStrRaw;
    const amountInt = !isNaN(parseFloat(amount)) ? Math.round(parseFloat(amount)).toString() : amountStrRaw;

    const amountsToTry = Array.from(new Set([amountStrRaw, amountFixed2, amountFixed1, amountInt]));

    for (const amt of amountsToTry) {
      const hashString = `${salt}|${status}|${udf10}|${udf9}|${udf8}|${udf7}|${udf6}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amt}|${txnid}|${key}`;
      const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
      if (calculatedHash === receivedHash) {
        return { isValid: true, calculatedHash, receivedHash };
      }
    }

    // Fallback calculation for debugging
    const defaultHashString = `${salt}|${status}|${udf10}|${udf9}|${udf8}|${udf7}|${udf6}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amountStrRaw}|${txnid}|${key}`;
    const defaultCalculatedHash = crypto.createHash('sha512').update(defaultHashString).digest('hex');

    return {
      isValid: false,
      calculatedHash: defaultCalculatedHash,
      receivedHash: hash
    };
  }

  /**
   * Initiate Payment Link with Easebuzz
   * @param {Object} paymentData 
   */
  async initiatePayment(paymentData) {
    const { key, salt, baseUrl } = this.getCredentials();

    if (!key || !salt) {
      throw new Error('Easebuzz Merchant KEY or SALT is not configured in .env file.');
    }

    const {
      txnid,
      amount,
      productinfo,
      firstname,
      phone,
      email,
      surl,
      furl,
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      udf6 = '',
      udf7 = '',
      udf8 = '',
      udf9 = '',
      udf10 = ''
    } = paymentData;

    const formattedAmount = parseFloat(amount).toFixed(2);

    const hash = this.generateInitiateHash({
      txnid,
      amount: formattedAmount,
      productinfo,
      firstname,
      email,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      udf6,
      udf7,
      udf8,
      udf9,
      udf10
    });

    const formData = new URLSearchParams();
    formData.append('key', key);
    formData.append('txnid', txnid);
    formData.append('amount', formattedAmount);
    formData.append('productinfo', productinfo);
    formData.append('firstname', firstname);
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('surl', surl);
    formData.append('furl', furl);
    formData.append('hash', hash);
    formData.append('udf1', udf1);
    formData.append('udf2', udf2);
    formData.append('udf3', udf3);
    formData.append('udf4', udf4);
    formData.append('udf5', udf5);

    try {
      const response = await fetch(`${baseUrl}/payment/initiateLink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formData.toString()
      });

      const responseData = await response.json();

      if (responseData.status === 1 && responseData.data) {
        const accessKey = responseData.data;
        const paymentUrl = `${baseUrl}/pay/${accessKey}`;
        return {
          success: true,
          accessKey,
          paymentUrl,
          txnid,
          raw: responseData
        };
      } else {
        const errorMsg = responseData.error_desc || responseData.data || 'Easebuzz payment initiation failed';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('[Easebuzz] initiatePayment Error:', error.message);
      throw new Error(`Easebuzz Gateway: ${error.message}`);
    }
  }

  /**
   * Verify/Retrieve Transaction Status directly from Easebuzz API
   */
  async retrieveTransaction(txnid, amount, email = '', phone = '') {
    const { key, salt, baseUrl } = this.getCredentials();
    if (!key || !salt || !txnid) return null;

    const formattedAmount = parseFloat(amount || 0).toFixed(2);
    const cleanEmail = (email || '').trim();
    const cleanPhone = (phone || '').trim();

    const hashString = `${key}|${txnid}|${formattedAmount}|${cleanEmail}|${cleanPhone}|${salt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const formData = new URLSearchParams();
    formData.append('key', key);
    formData.append('txnid', txnid);
    formData.append('amount', formattedAmount);
    formData.append('email', cleanEmail);
    formData.append('phone', cleanPhone);
    formData.append('hash', hash);

    try {
      const response = await fetch(`${baseUrl}/transaction/v1/retrieve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formData.toString()
      });
      return await response.json();
    } catch (err) {
      console.warn('[Easebuzz] retrieveTransaction Warning:', err.message);
      return null;
    }
  }
}

module.exports = new EasebuzzService();
