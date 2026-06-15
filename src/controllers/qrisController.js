const qrisService = require('../services/qrisService');

class QRISController {
  
  /**
   * Generate QRIS payment
   * POST /api/qris/generate
   */
  async generateQRIS(req, res) {
    const { amount, orderId, customer_name, customer_email } = req.body;
    
    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required and must be greater than 0'
      });
    }
    
    if (amount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum amount is IDR 1,000'
      });
    }
    
    try {
      const result = await qrisService.generateQRIS(
        amount,
        orderId,
        customer_name,
        customer_email
      );
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('Generate QRIS error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Check payment status
   * GET /api/qris/status/:orderId
   */
  async checkStatus(req, res) {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    try {
      const status = await qrisService.checkPaymentStatus(orderId);
      
      res.json({
        success: true,
        data: status
      });
      
    } catch (error) {
      console.error('Check status error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Webhook for payment notification
   * POST /api/qris/webhook
   */
  async webhook(req, res) {
    const signature = req.headers['x-signature'];
    const payload = req.body;
    
    // Verify signature
    if (!qrisService.verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }
    
    // Process webhook
    const { order_id, transaction_status, payment_type, gross_amount } = payload;
    
    console.log(`Webhook received: Order ${order_id} - Status: ${transaction_status}`);
    
    // Here you can update your database, send notification, etc.
    // await updateOrderStatus(order_id, transaction_status);
    // await sendNotification(order_id, transaction_status);
    
    res.json({
      success: true,
      message: 'Webhook received'
    });
  }
  
  /**
   * Get QR code image only (for embedding)
   * GET /api/qris/image/:orderId
   */
  async getQRImage(req, res) {
    const { orderId } = req.params;
    
    try {
      const status = await qrisService.checkPaymentStatus(orderId);
      
      if (status.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Payment already completed'
        });
      }
      
      // Regenerate QRIS
      const result = await qrisService.generateQRIS(status.amount, orderId);
      
      res.setHeader('Content-Type', 'image/png');
      const imageBuffer = Buffer.from(result.qrImage.split(',')[1], 'base64');
      res.send(imageBuffer);
      
    } catch (error) {
      console.error('Get QR image error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new QRISController();