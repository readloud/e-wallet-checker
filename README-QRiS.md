# QRIS Payment Gateway API

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/express-4.18.x-blue.svg)](https://expressjs.com/)
[![QRIS](https://img.shields.io/badge/QRIS-Standard-red.svg)](https://qris.id/)

## 📋 Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur](#fitur)
- [Supported E-Wallets](#supported-e-wallets)
- [Prasyarat](#prasyarat)
- [Instalasi Lokal](#instalasi-lokal)
- [Deployment ke AWS](#deployment-ke-aws)
- [Deployment ke GCP](#deployment-ke-gcp)
- [API Dokumentasi](#api-dokumentasi)
- [Webhook Integration](#webhook-integration)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)

## 🎯 Tentang Proyek

API ini menyediakan integrasi **QRIS Standard** untuk menerima pembayaran dari **SEMUA e-wallet** (GoPay, OVO, DANA, ShopeePay, LinkAja, dll) dalam satu QR code.

### Keuntungan QRIS:
- ✅ **Satu QR untuk semua e-wallet** - Customer bisa scan dengan app apapun
- ✅ **Standar nasional** - Resmi dari Bank Indonesia
- ✅ **Biaya lebih rendah** dibanding multiple payment gateway
- ✅ **Settlement lebih cepat** (D+1 atau D+0)
- ✅ **Tidak perlu integrasi ke masing-masing e-wallet**

## Supported E-Wallets

| E-Wallet | Support via QRIS | Verifikasi |
|----------|-----------------|------------|
| GoPay | ✅ | Bisa scan QRIS |
| OVO | ✅ | Bisa scan QRIS |
| DANA | ✅ | Bisa scan QRIS |
| ShopeePay | ✅ | Bisa scan QRIS |
| LinkAja | ✅ | Bisa scan QRIS |
| 15+ bank apps | ✅ | Bisa scan QRIS |

## 📋 Prasyarat

- Node.js 20+
- Akses ke QRIS Provider (InterActive, DOKU, atau Midtrans)
- Domain dengan HTTPS (wajib untuk webhook)
- (Opsional) PostgreSQL untuk menyimpan transaksi

## 🚀 Instalasi Lokal

### 1. Clone Repository

```bash
git clone https://github.com/your-username/qris-payment-integration.git
cd qris-payment-integration
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Daftar QRIS Provider

Pilih salah satu provider:

#### Option A: InterActive (Recommended untuk pemula)
```bash
# 1. Daftar di https://qris.interactive.co.id
# 2. Dapatkan API Key dan MID
# 3. Isi ke .env
```

#### Option B: DOKU (Untuk volume besar)
```bash
# 1. Daftar di https://dashboard.doku.com
# 2. Dapatkan Client ID & Secret
# 3. Isi ke .env
```

#### Option C: Midtrans (Populer)
```bash
# 1. Daftar di https://dashboard.midtrans.com
# 2. Dapatkan Server Key
# 3. Isi ke .env
```

### 4. Setup Environment

```bash
cp .env.example .env.development
nano .env.development
```

### 5. Jalankan Aplikasi

```bash
npm run dev
```

## ☁️ Deployment ke AWS

### Option 1: EC2 (Simple)

```bash
# Launch Ubuntu 22.04 t3.micro
# SSH ke instance

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone and setup
git clone https://github.com/your-username/qris-payment-integration.git
cd qris-payment-integration
npm ci --only=production

# Setup environment
cp .env.example .env.production
nano .env.production

# Install PM2
sudo npm install -g pm2
pm2 start server.js --name qris-api
pm2 save
pm2 startup

# Install Nginx
sudo apt install -y nginx

# Configure Nginx (same as Proyek A)
```

### Option 2: Lambda + API Gateway (Serverless)

```javascript
// lambda.js
const serverless = require('serverless-http');
const app = require('./server');

exports.handler = serverless(app);
```

```yaml
# serverless.yml
service: qris-payment-api

provider:
  name: aws
  runtime: nodejs20.x
  region: ap-southeast-1
  timeout: 30

functions:
  api:
    handler: lambda.handler
    events:
      - httpApi: '*'
```

```bash
# Deploy
npm install -g serverless
serverless deploy
```

## ☁️ Deployment ke GCP

### Cloud Run (Recommended)

```bash
# Build container
gcloud builds submit --tag gcr.io/your-project/qris-api

# Deploy
gcloud run deploy qris-api \
  --image gcr.io/your-project/qris-api \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 30
```

## 📖 API Dokumentasi

### 1. Generate QRIS Payment

```http
POST /api/qris/generate
Content-Type: application/json

{
  "amount": 50000,
  "orderId": "INV-001",
  "customer_name": "John Doe",
  "customer_email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "INV-001",
    "amount": 50000,
    "qrisContent": "00020101021126690016COM.ID...",
    "qrImage": "data:image/png;base64,iVBORw0KG...",
    "qrString": "https://qr.example.com/xxx",
    "expiredAt": "2024-01-15T11:00:00Z",
    "provider": "interactive"
  }
}
```

### 2. Check Payment Status

```http
GET /api/qris/status/INV-001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "INV-001",
    "status": "paid",
    "amount": 50000,
    "paidAt": "2024-01-15T10:35:00Z",
    "reference": "REF123456"
  }
}
```

### 3. Get QR Code Image (For embedding)

```http
GET /api/qris/image/INV-001
```

**Response:** PNG image directly

### 4. Webhook (Called by Provider)

```http
POST /api/qris/webhook
Content-Type: application/json
X-Signature: sha256_signature_here

{
  "order_id": "INV-001",
  "transaction_status": "settlement",
  "payment_type": "QRIS",
  "gross_amount": 50000,
  "transaction_time": "2024-01-15T10:35:00Z"
}
```

**Response:** 
```json
{
  "success": true,
  "message": "Webhook received"
}
```

## 🔔 Webhook Integration

### Webhook Events

| Event | Description | Action |
|-------|-------------|--------|
| `pending` | QRIS generated, waiting payment | Tampilkan QR code |
| `settlement` | Payment successful | Update order status, send email |
| `expire` | QRIS expired | Notify customer to regenerate |
| `cancel` | Payment cancelled | Release order |

### Webhook Security

```javascript
// Verify webhook signature
function verifySignature(payload, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.QRIS_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Webhook Testing (ngrok)

```bash
# For local testing
ngrok http 3001

# Use ngrok URL in provider dashboard
https://abc123.ngrok.io/api/qris/webhook
```

## 🔧 Troubleshooting

### Issue 1: QRIS Generation Failed - "Invalid API Key"

**Penyebab:** API key salah atau belum aktif.

**Solusi:**
```bash
# Check API key di dashboard provider
# Test dengan cURL
curl -X POST "https://qris.interactive.co.id/restapi/qris/show_qris.php" \
  -d "do=create-invoice&apikey=YOUR_KEY&mID=YOUR_MID&cliTrxNumber=TEST&cliTrxAmount=1000"
```

### Issue 2: Customer Cannot Scan QRIS

**Penyebab:** QR code terlalu kecil atau format tidak sesuai.

**Solusi:**
```javascript
// Generate QR dengan size yang cukup
const qrImage = await QRCode.toDataURL(qrisContent, {
  width: 500,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
});

// Atau tampilkan dalam bentuk text
res.json({ qrString: qrisContent }); // Customer bisa copy-paste
```

### Issue 3: Webhook Not Received

**Penyebab:** Firewall blocking atau URL tidak reachable.

**Solusi:**
```bash
# Test endpoint accessible dari internet
curl -X POST https://api.ewallet.com/api/qris/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check logs
pm2 logs qris-api | grep webhook

# Add retry mechanism
async function retryWebhook(payload, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.post(webhookUrl, payload);
      break;
    } catch (error) {
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

### Issue 4: Payment Status Not Updated

**Penyebab:** Webhook gagal atau status belum sinkron.

**Solusi:**
```javascript
// Implement fallback: periodic status check
setInterval(async () => {
  const pendingOrders = await getPendingOrders();
  for (const order of pendingOrders) {
    const status = await qrisService.checkPaymentStatus(order.orderId);
    if (status.status === 'paid') {
      await updateOrderStatus(order.orderId, 'paid');
      await sendNotification(order.customerEmail);
    }
  }
}, 60000); // Check every minute
```

### Issue 5: QRIS Expired Before Payment

**Penyebab:** QRIS TTL (Time To Live) habis (biasanya 1 jam).

**Solusi:**
```javascript
// Extend expiry or regenerate
if (paymentStatus === 'expired') {
  const newQR = await qrisService.generateQRIS(amount, orderId);
  // Notify customer to scan new QR
}
```

### Issue 6: CORS Error on Frontend

**Penyebab:** Frontend di domain berbeda.

**Solusi:**
```javascript
// Enable CORS for specific origin
app.use(cors({
  origin: ['https://your-frontend.com', 'https://admin.ewallet.com'],
  credentials: true
}));
```

## ⚡ Performance Optimization

### Caching Strategy

```javascript
// Cache QR code untuk mengurangi generate ulang
const cache = new Map();

async function getCachedQR(orderId, amount) {
  const cacheKey = `qris:${orderId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const qris = await qrisService.generateQRIS(amount, orderId);
  await redis.setex(cacheKey, 3000, JSON.stringify(qris)); // Cache 50 minutes
  
  return qris;
}
```

### Rate Limiting untuk Generate QR

```javascript
const rateLimit = require('express-rate-limit');

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // Max 10 QR generations per minute per IP
  message: { success: false, message: 'Too many requests' }
});

app.post('/api/qris/generate', generateLimiter, qrisController.generateQRIS);
```

### Database Indexing (jika pakai PostgreSQL)

```sql
CREATE INDEX idx_qris_orders_order_id ON orders(order_id);
CREATE INDEX idx_qris_orders_status ON orders(status);
CREATE INDEX idx_qris_orders_created_at ON orders(created_at);
CREATE INDEX idx_qris_orders_customer_email ON orders(customer_email);
```

## 📊 Monitoring

### Health Check

```bash
curl https://payment.ewallet.com/health
```

### Metrics Endpoint

```javascript
app.get('/metrics', async (req, res) => {
  const metrics = {
    total_payments: await getTotalPayments(),
    success_rate: await getSuccessRate(),
    avg_response_time: await getAvgResponseTime(),
    pending_orders: await getPendingOrdersCount()
  };
  res.json(metrics);
});
```

### Alerts

```javascript
// Slack notification for failed payments
async function sendAlert(message) {
  await axios.post(process.env.SLACK_WEBHOOK, {
    text: `🚨 ${message}`,
    channel: '#payment-alerts'
  });
}

if (failedCount > 10) {
  sendAlert(`High failure rate detected: ${failedCount} failed in last hour`);
}
```

## 🚨 Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| QR001 | Invalid amount | Min IDR 1,000 |
| QR002 | QRIS generation failed | Check provider API key |
| QR003 | Order ID already exists | Use unique order ID |
| QR004 | Payment timeout | Regenerate QRIS |
| QR005 | Webhook signature invalid | Check webhook secret |
| QR006 | Provider API error | Retry or switch provider |
