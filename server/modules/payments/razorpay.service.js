const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TZAWZi6xItEYWa';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'zaCUtNZsCgq1jLERhZ7FidtX';
    
    if (this.keyId && this.keySecret) {
      this.razorpay = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret
      });
    }
  }

  /**
   * Create a Razorpay Order
   * @param {Object} options - { amount (in INR), receipt, notes }
   */
  async createOrder({ amount, receipt, notes = {} }) {
    if (!this.razorpay) {
      throw new Error('Razorpay is not configured properly in environment variables.');
    }

    const options = {
      amount: Math.round(Number(amount) * 100), // Amount in paise
      currency: 'INR',
      receipt: receipt || `rcpt_${Date.now()}`,
      notes
    };

    const order = await this.razorpay.orders.create(options);
    return order;
  }

  /**
   * Verify Razorpay Payment Signature
   * @param {Object} params - { razorpay_order_id, razorpay_payment_id, razorpay_signature }
   */
  verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    if (!this.keySecret) return false;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpay_signature;
  }
}

module.exports = new RazorpayService();
