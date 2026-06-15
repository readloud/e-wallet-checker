const axios = require('axios');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class QRISService {
  constructor() {
    this.provider = process.env.QRIS_PROVIDER || 'interactive';
  }

  /**
   * Generate QRIS payment QR code
   * @param {number} amount - Jumlah pembayaran
   * @param {string} orderId - ID order unik
   * @param {string} customerName - Nama customer (opsional)
   * @param {string} customerEmail - Email customer (opsional)
   * @returns {Promise<{qrisContent: string, qrImage: string, orderId: string}>}
   */
  async generateQRIS(amount, orderId = null, customerName = null, customerEmail = null) {
    const finalOrderId = orderId || `QRIS-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    
    switch (this.provider) {
      case 'interactive':
        return this.generateInteractiveQRIS(amount, finalOrderId, customerName, customerEmail);
      case 'doku':
        return this.generateDokuQRIS(amount, finalOrderId, customerName, customerEmail);
      case 'midtrans':
        return this.generateMidtransQRIS(amount, finalOrderId, customerName, customerEmail);
      default:
        throw new Error(`Unknown QRIS provider: ${this.provider}`);
    }
  }

  /**
   * QRIS via InterActive (Recommended - Simple integration)
   */
  async generateInteractiveQRIS(amount, orderId, customerName, customerEmail) {
    const params = new URLSearchParams({
      do: 'create-invoice',
      apikey: process.env.INTERACTIVE_API_KEY,
      mID: process.env.INTERACTIVE_MID,
      cliTrxNumber: orderId,
      cliTrxAmount: amount,
      useTip: 'no',
      useFee: 'no'
    });

    if (customerName) {
      params.append('cliName', customerName);
    }
    if (customerEmail) {
      params.append('cliEmail', customerEmail);
    }

    const response = await axios.post(
      `${process.env.INTERACTIVE_API_URL}/show_qris.php`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      }
    );

    const data = response.data;

    if (data.code !== '200') {
      throw new Error(`QRIS Error: ${data.message || 'Failed to generate QRIS'}`);
    }

    // Generate QR code image from qris_content
    const qrImage = await QRCode.toDataURL(data.data.qris_content);

    return {
      success: true,
      orderId: orderId,
      amount: amount,
      qrisContent: data.data.qris_content,
      qrImage: qrImage,
      qrString: data.data.qr_string,
      expiredAt: data.data.expired_at,
      provider: 'interactive'
    };
  }

  /**
   * QRIS via DOKU (More features, longer integration)
   */
  async generateDokuQRIS(amount, orderId, customerName, customerEmail) {
    const timestamp = new Date().toISOString();
    const requestBody = {
      order: {
        amount: amount.toString(),
        invoice_number: orderId,
        currency: 'IDR'
      },
      payment: {
        payment_due_date: 3600, // 1 hour in seconds
        payment_method_types: ['QRIS']
      },
      customer: {
        name: customerName || 'Customer',
        email: customerEmail || `customer-${orderId}@example.com`
      }
    };

    // Get access token
    const tokenResponse = await axios.post(
      `${process.env.DOKU_API_URL}/v1/oauth/token`,
      {
        clientId: process.env.DOKU_CLIENT_ID,
        clientSecret: process.env.DOKU_CLIENT_SECRET,
        grantType: 'client_credentials'
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const accessToken = tokenResponse.data.accessToken;

    // Generate signature
    const signature = this.generateDokuSignature(requestBody, timestamp);

    // Create QRIS payment
    const response = await axios.post(
      `${process.env.DOKU_API_URL}/v1/payment/qris`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-TIMESTAMP': timestamp,
          'X-SIGNATURE': signature,
          'X-PARTNER-ID': process.env.DOKU_PARTNER_ID
        }
      }
    );

    const data = response.data;

    if (data.responseCode !== '2000700') {
      throw new Error(`DOKU QRIS Error: ${data.responseMessage}`);
    }

    const qrImage = await QRCode.toDataURL(data.qrContent);

    return {
      success: true,
      orderId: orderId,
      amount: amount,
      qrisContent: data.qrContent,
      qrImage: qrImage,
      qrString: data.qrString,
      expiredAt: data.expiredAt,
      provider: 'doku'
    };
  }

  /**
   * QRIS via Midtrans
   */
  async generateMidtransQRIS(amount, orderId, customerName, customerEmail) {
    const requestBody = {
      payment_type: 'qris',
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: customerName || 'Customer',
        email: customerEmail || `customer-${orderId}@example.com`
      },
      qris: {
        acquirer: 'gopay' // or 'airpay_shopeepay', 'dana', 'ovo'
      }
    };

    const authString = Buffer.from(process.env.MIDTRANS_SERVER_KEY + ':').toString('base64');

    const response = await axios.post(
      `${process.env.MIDTRANS_API_URL}/charge`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        timeout: 30000
      }
    );

    const data = response.data;

    if (data.status_code !== '201') {
      throw new Error(`Midtrans QRIS Error: ${data.status_message}`);
    }

    const qrImage = await QRCode.toDataURL(data.qr_string);

    return {
      success: true,
      orderId: orderId,
      amount: amount,
      qrisContent: data.qr_string,
      qrImage: qrImage,
      qrString: data.qr_string,
      expiredAt: data.expiry_time,
      transactionId: data.transaction_id,
      provider: 'midtrans'
    };
  }

  /**
   * Check payment status
   * @param {string} orderId - ID order
   */
  async checkPaymentStatus(orderId) {
    switch (this.provider) {
      case 'interactive':
        return this.checkInteractiveStatus(orderId);
      case 'doku':
        return this.checkDokuStatus(orderId);
      case 'midtrans':
        return this.checkMidtransStatus(orderId);
      default:
        throw new Error(`Unknown QRIS provider: ${this.provider}`);
    }
  }

  async checkInteractiveStatus(orderId) {
    const params = new URLSearchParams({
      do: 'check-status',
      apikey: process.env.INTERACTIVE_API_KEY,
      mID: process.env.INTERACTIVE_MID,
      cliTrxNumber: orderId
    });

    const response = await axios.post(
      `${process.env.INTERACTIVE_API_URL}/show_qris.php`,
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const data = response.data;

    return {
      orderId: orderId,
      status: data.status === 'SUCCESS' ? 'paid' : 'pending',
      amount: data.amount,
      paidAt: data.paid_at,
      reference: data.reference
    };
  }

  async checkDokuStatus(orderId) {
    const timestamp = new Date().toISOString();
    const signature = this.generateDokuSignature({ orderId }, timestamp);

    const response = await axios.get(
      `${process.env.DOKU_API_URL}/v1/payment/qris/${orderId}`,
      {
        headers: {
          'X-TIMESTAMP': timestamp,
          'X-SIGNATURE': signature,
          'X-PARTNER-ID': process.env.DOKU_PARTNER_ID
        }
      }
    );

    const data = response.data;

    return {
      orderId: orderId,
      status: data.transactionStatus === 'SETTLEMENT' ? 'paid' : 'pending',
      amount: data.amount,
      paidAt: data.settlementTime
    };
  }

  async checkMidtransStatus(orderId) {
    const authString = Buffer.from(process.env.MIDTRANS_SERVER_KEY + ':').toString('base64');

    const response = await axios.get(
      `${process.env.MIDTRANS_API_URL}/${orderId}/status`,
      {
        headers: { 'Authorization': `Basic ${authString}` }
      }
    );

    const data = response.data;

    return {
      orderId: orderId,
      status: data.transaction_status === 'settlement' ? 'paid' : data.transaction_status,
      amount: data.gross_amount,
      paidAt: data.settlement_time,
      paymentType: data.payment_type
    };
  }

  /**
   * Generate DOKU signature (HMAC SHA256)
   */
  generateDokuSignature(body, timestamp) {
    const stringToSign = `${timestamp}|${JSON.stringify(body)}`;
    const hmac = crypto.createHmac('sha256', process.env.DOKU_CLIENT_SECRET);
    hmac.update(stringToSign);
    return hmac.digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.QRIS_WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = new QRISService();