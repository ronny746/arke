const paymentsService = require('./payments.service');
const easebuzzService = require('./easebuzz.service');

class PaymentsController {
  /**
   * POST /api/v1/payments/easebuzz/initiate
   */
  async initiateEasebuzz(req, res) {
    try {
      const { courseId } = req.body;
      if (!courseId) {
        return res.status(400).json({ success: false, message: 'courseId is required' });
      }

      const envAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
      let originUrl = req.headers.origin;
      if (!originUrl) {
        const isHttps = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' || (req.get('host') && !req.get('host').includes('localhost'));
        originUrl = `${isHttps ? 'https' : 'http'}://${req.get('host')}`;
      }
      if (envAppUrl && envAppUrl.startsWith('https://') && originUrl.startsWith('http://')) {
        originUrl = envAppUrl;
      }

      const result = await paymentsService.initiateCoursePayment(req.user, courseId, originUrl);

      return res.status(200).json(result);
    } catch (err) {
      console.error('[PaymentsController] initiateEasebuzz error:', err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/payments/easebuzz/response
   * Callback URL invoked by Easebuzz (SURL / FURL)
   */
  async handleEasebuzzResponse(req, res) {
    try {
      const body = { ...(req.query || {}), ...(req.body || {}) };
      const result = await paymentsService.handleEasebuzzResponse(body);

      // Determine redirect URL (Always enforce HTTPS in non-localhost production environments)
      const host = req.get('host');
      const envAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
      const isHttps = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' || (host && !host.includes('localhost'));
      const baseUrl = (envAppUrl && envAppUrl.startsWith('https://')) ? envAppUrl : `${isHttps ? 'https' : 'http'}://${host}`;

      const params = new URLSearchParams({
        txnid: result.txnid || body.txnid || '',
        status: result.status || 'failed',
        easepayid: result.easepayid || body.easepayid || '',
        courseId: result.courseId || body.udf2 || '',
        amount: body.amount || '',
        message: result.message || ''
      });

      const redirectUrl = `${baseUrl.replace(/\/$/, '')}/payment/status?${params.toString()}`;

      // Return an HTML auto-redirect to ensure full cross-browser compatibility with POST callbacks
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting to Payment Status...</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
            .card { background: white; padding: 32px 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); text-align: center; }
            .spinner { border: 4px solid #e2e8f0; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 16px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            a { color: #2563eb; text-decoration: none; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h2>Processing Payment Status</h2>
            <p>Please wait while we redirect you to your confirmation...</p>
            <p><a href="${redirectUrl}">Click here if not redirected automatically</a></p>
          </div>
          <script>
            window.location.href = "${redirectUrl}";
          </script>
        </body>
        </html>
      `);
    } catch (err) {
      console.error('[PaymentsController] handleEasebuzzResponse error:', err);
      return res.redirect(`/payment/status?status=failed&message=${encodeURIComponent('Payment processing failed')}`);
    }
  }

  /**
   * POST /api/v1/payments/easebuzz/webhook
   * Server-to-Server webhook listener
   */
  async handleEasebuzzWebhook(req, res) {
    try {
      const body = req.body || {};
      await paymentsService.handleEasebuzzResponse(body);
      return res.status(200).json({ success: true, message: 'Webhook processed' });
    } catch (err) {
      console.error('[PaymentsController] handleEasebuzzWebhook error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/payments/status/:txnid
   */
  async getPaymentStatus(req, res) {
    try {
      const { txnid } = req.params;
      const txn = await paymentsService.getTransactionDetails(txnid);
      return res.status(200).json({ success: true, data: txn });
    } catch (err) {
      return res.status(404).json({ success: false, message: err.message });
    }
  }
}

module.exports = new PaymentsController();
