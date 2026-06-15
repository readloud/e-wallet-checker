# 🔧 SETUP LENGKAP MEMBUAT API ENDPOINT SENDIRI

Saya akan pandu Anda **membuat API endpoint dari NOL** untuk integrasi e-wallet. Ini adalah panduan **step-by-step** yang bisa Anda ikuti bahkan jika belum pernah membuat API sebelumnya.

---

## 📚 DAFTAR ISI

1. [Persiapan Awal](#persiapan-awal)
2. [Membuat API Endpoint Basic (Tanpa E-Wallet)](#membuat-api-endpoint-basic)
3. [Membuat API Endpoint untuk Cek Nickname](#membuat-api-endpoint-untuk-cek-nickname)
4. [Membuat API Endpoint untuk Integrasi E-Wallet](#membuat-api-endpoint-untuk-integrasi-e-wallet)
5. [Testing API Endpoint](#testing-api-endpoint)
6. [Deploy API Endpoint ke Server](#deploy-api-endpoint-ke-server)

---

## 🖥️ PERSIAPAN AWAL

### Yang Anda Butuhkan:

| Komponen | Minimal Spec | Download Link |
|----------|--------------|---------------|
| **Node.js** | v20 atau lebih baru | [nodejs.org](https://nodejs.org) |
| **Text Editor** | VS Code, Sublime, atau Notepad++ | [code.visualstudio.com](https://code.visualstudio.com) |
| **Postman** (Testing API) | Versi terbaru | [postman.com](https://postman.com) |
| **Git** (Opsional) | Versi terbaru | [git-scm.com](https://git-scm.com) |

### Cek Instalasi

```bash
# Buka terminal (Command Prompt / PowerShell / Terminal)

# Cek Node.js sudah terinstall
node --version
# Harus muncul: v20.x.x atau lebih tinggi

# Cek npm sudah terinstall
npm --version
# Harus muncul: 10.x.x atau lebih tinggi
```

---

## 🚀 MEMBUAT API ENDPOINT BASIC

### Step 1: Buat Folder Proyek

```bash
# Buat folder baru
mkdir my-first-api
cd my-first-api

# Inisialisasi project Node.js
npm init -y
```

### Step 2: Install Package yang Dibutuhkan

```bash
# Install Express (framework web untuk API)
npm install express

# Install untuk development (auto-restart saat coding)
npm install --save-dev nodemon
```

### Step 3: Buat File `server.js`

Buat file baru bernama `server.js` di folder proyek Anda:

```javascript
// server.js
const express = require('express');

// Buat aplikasi Express
const app = express();

// Middleware untuk membaca JSON dari request
app.use(express.json());

// ============================================
// MEMBUAT ENDPOINT PERTAMA KITA
// ============================================

// Endpoint GET: http://localhost:3000/
app.get('/', (req, res) => {
  res.json({
    message: 'API saya sudah berjalan!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// Endpoint GET: http://localhost:3000/hello
app.get('/hello', (req, res) => {
  res.json({
    message: 'Halo dunia!',
    author: 'API Creator'
  });
});

// Endpoint POST: http://localhost:3000/sapa
// Kirim data: { "nama": "Budi" }
app.post('/sapa', (req, res) => {
  const { nama } = req.body;
  
  if (!nama) {
    return res.status(400).json({
      error: 'Parameter nama diperlukan'
    });
  }
  
  res.json({
    message: `Halo ${nama}, selamat datang di API saya!`
  });
});

// ============================================
// MENJALANKAN SERVER
// ============================================

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`📝 Coba buka: http://localhost:3000/hello`);
});
```

### Step 4: Jalankan Server

```bash
# Jalankan dengan Node biasa
node server.js

# ATAU dengan nodemon (auto restart saat file berubah)
npx nodemon server.js
```

### Step 5: Test API Endpoint

**Cara 1: Buka Browser**
- Buka `http://localhost:3000/` → Lihat response JSON
- Buka `http://localhost:3000/hello` → Lihat response JSON

**Cara 2: Gunakan Terminal (cURL)**

```bash
# GET request
curl http://localhost:3000/hello

# POST request
curl -X POST http://localhost:3000/sapa \
  -H "Content-Type: application/json" \
  -d '{"nama": "Budi"}'
```

**Cara 3: Gunakan Postman (Recommended)**
1. Buka Postman
2. Klik "New Request"
3. Method: POST, URL: `http://localhost:3000/sapa`
4. Tab Body → raw → JSON, masukkan: `{"nama": "Budi"}`
5. Klik Send

✅ **Selamat! Anda sudah berhasil membuat API endpoint pertama!**

---

## 🔍 MEMBUAT API ENDPOINT UNTUK CEK NICKNAME

Sekarang kita akan membuat API yang bisa **mengecek nickname/nama akun** (dengan data dummy/database lokal).

### Step 1: Tambahkan Data Dummy

Update file `server.js` Anda:

```javascript
// server.js - Lanjutan

const express = require('express');
const app = express();
app.use(express.json());

// ============================================
// DATA DUMMY (Simulasi database)
// ============================================
// Ini hanya contoh data. Di production, data akan dari database real.
const userDatabase = {
  // Format: "nomorHP:e-wallet" => nickname
  "081234567890:GoPay": { nickname: "Budi Santoso", phone: "081234567890", ewallet: "GoPay" },
  "081298765432:ShopeePay": { nickname: "Siti Aisyah", phone: "081298765432", ewallet: "ShopeePay" },
  "085678901234:DANA": { nickname: "Agus Wijaya", phone: "085678901234", ewallet: "DANA" },
  "087890123456:OVO": { nickname: "Rina Fauziah", phone: "087890123456", ewallet: "OVO" },
  "082345678901:iSaku": { nickname: "Dian Purnama", phone: "082345678901", ewallet: "iSaku" }
};

// ============================================
// API ENDPOINT UNTUK CEK NICKNAME
// ============================================

/**
 * Endpoint: POST /api/check-nickname
 * 
 * Cara pakai:
 * Kirim JSON: { "phone": "081234567890", "ewallet": "GoPay" }
 * 
 * Response jika sukses:
 * { 
 *   "success": true, 
 *   "data": { "nickname": "Budi Santoso", "phone": "081234567890", "ewallet": "GoPay" }
 * }
 * 
 * Response jika gagal:
 * { "success": false, "message": "Nickname tidak ditemukan" }
 */
app.post('/api/check-nickname', (req, res) => {
  // Ambil data dari request body
  const { phone, ewallet } = req.body;
  
  // Validasi: kedua parameter harus diisi
  if (!phone || !ewallet) {
    return res.status(400).json({
      success: false,
      message: 'Parameter phone dan ewallet wajib diisi'
    });
  }
  
  // Buat key untuk mencari di database
  const key = `${phone}:${ewallet}`;
  
  // Cari data
  const userData = userDatabase[key];
  
  // Jika ditemukan
  if (userData) {
    return res.json({
      success: true,
      data: userData
    });
  }
  
  // Jika tidak ditemukan
  return res.status(404).json({
    success: false,
    message: `Nickname untuk ${ewallet} dengan nomor ${phone} tidak ditemukan`
  });
});

// ============================================
// API ENDPOINT UNTUK BATCH CEK (MULTIPLE)
// ============================================

/**
 * Endpoint: POST /api/batch-check
 * 
 * Kirim: { "phones": ["081234567890", "081298765432"], "ewallet": "GoPay" }
 */
app.post('/api/batch-check', async (req, res) => {
  const { phones, ewallet } = req.body;
  
  if (!phones || !Array.isArray(phones) || phones.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Parameter phones harus berupa array tidak kosong'
    });
  }
  
  const results = [];
  
  for (const phone of phones) {
    const key = `${phone}:${ewallet}`;
    const userData = userDatabase[key];
    
    results.push({
      phone: phone,
      found: !!userData,
      nickname: userData?.nickname || null
    });
  }
  
  res.json({
    success: true,
    total: phones.length,
    found: results.filter(r => r.found).length,
    results: results
  });
});

// ============================================
// API ENDPOINT UNTUK MENAMBAH DATA (ADMIN)
// ============================================

/**
 * Endpoint: POST /api/add-user (Admin only)
 * 
 * Kirim: { "phone": "081234567890", "ewallet": "GoPay", "nickname": "Nama User" }
 */
app.post('/api/add-user', (req, res) => {
  const { phone, ewallet, nickname } = req.body;
  
  if (!phone || !ewallet || !nickname) {
    return res.status(400).json({
      success: false,
      message: 'Parameter phone, ewallet, dan nickname wajib diisi'
    });
  }
  
  const key = `${phone}:${ewallet}`;
  
  // Simpan ke database (dalam memory)
  userDatabase[key] = {
    nickname: nickname,
    phone: phone,
    ewallet: ewallet
  };
  
  res.json({
    success: true,
    message: `User ${nickname} berhasil ditambahkan`,
    data: userDatabase[key]
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Server berjalan di http://localhost:${PORT}`);
  console.log('');
  console.log('📝 Contoh penggunaan:');
  console.log(`   POST http://localhost:${PORT}/api/check-nickname`);
  console.log(`   Body: { "phone": "081234567890", "ewallet": "GoPay" }`);
});
```

### Step 2: Test API dengan cURL

```bash
# Test check nickname - sukses
curl -X POST http://localhost:3000/api/check-nickname \
  -H "Content-Type: application/json" \
  -d '{"phone": "081234567890", "ewallet": "GoPay"}'

# Test check nickname - gagal (data tidak ada)
curl -X POST http://localhost:3000/api/check-nickname \
  -H "Content-Type: application/json" \
  -d '{"phone": "089999999999", "ewallet": "GoPay"}'

# Test batch check
curl -X POST http://localhost:3000/api/batch-check \
  -H "Content-Type: application/json" \
  -d '{"phones": ["081234567890", "081298765432"], "ewallet": "GoPay"}'

# Test add user
curl -X POST http://localhost:3000/api/add-user \
  -H "Content-Type: application/json" \
  -d '{"phone": "088888888888", "ewallet": "DANA", "nickname": "User Baru"}'
```

✅ **Anda sekarang punya API endpoint untuk cek nickname!**

---

## 🔐 MEMBUAT API ENDPOINT DENGAN AUTENTIKASI (API KEY)

Agar API Anda aman, tambahkan autentikasi dengan API Key.

### Update `server.js` dengan API Key Middleware

```javascript
// server.js - Tambahkan autentikasi

const express = require('express');
const app = express();
app.use(express.json());

// ============================================
// API KEY CONFIGURATION
// ============================================
// API Key yang valid (simpan di environment variable untuk production)
const VALID_API_KEYS = [
  'api_key_production_12345',      // Untuk production app
  'api_key_testing_67890'          // Untuk testing
];

// Middleware untuk memeriksa API Key
function verifyApiKey(req, res, next) {
  // Ambil API Key dari header
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key diperlukan. Kirim di header: X-API-Key'
    });
  }
  
  if (!VALID_API_KEYS.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      message: 'API Key tidak valid'
    });
  }
  
  // API Key valid, lanjutkan ke endpoint
  next();
}

// ============================================
// DATA DUMMY (sama seperti sebelumnya)
// ============================================
const userDatabase = {
  "081234567890:GoPay": { nickname: "Budi Santoso", phone: "081234567890", ewallet: "GoPay" },
  "081298765432:ShopeePay": { nickname: "Siti Aisyah", phone: "081298765432", ewallet: "ShopeePay" },
  "085678901234:DANA": { nickname: "Agus Wijaya", phone: "085678901234", ewallet: "DANA" }
};

// ============================================
// ENDPOINT YANG TERPROTEKSI (Perlu API Key)
// ============================================

// Endpoint ini memerlukan API Key
app.post('/api/check-nickname', verifyApiKey, (req, res) => {
  const { phone, ewallet } = req.body;
  
  if (!phone || !ewallet) {
    return res.status(400).json({
      success: false,
      message: 'Parameter phone dan ewallet wajib diisi'
    });
  }
  
  const key = `${phone}:${ewallet}`;
  const userData = userDatabase[key];
  
  if (userData) {
    return res.json({
      success: true,
      data: userData
    });
  }
  
  return res.status(404).json({
    success: false,
    message: `Nickname tidak ditemukan`
  });
});

// ============================================
// PUBLIC ENDPOINT (Tidak perlu API Key)
// ============================================

// Health check - tidak perlu API Key
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Server berjalan di http://localhost:${PORT}`);
  console.log('');
  console.log('📝 Cara menggunakan API Key:');
  console.log(`   Header: X-API-Key: api_key_production_12345`);
});
```

### Test dengan API Key

```bash
# Test tanpa API Key (akan gagal)
curl -X POST http://localhost:3000/api/check-nickname \
  -H "Content-Type: application/json" \
  -d '{"phone": "081234567890", "ewallet": "GoPay"}'

# Test dengan API Key (akan sukses)
curl -X POST http://localhost:3000/api/check-nickname \
  -H "Content-Type: application/json" \
  -H "X-API-Key: api_key_production_12345" \
  -d '{"phone": "081234567890", "ewallet": "GoPay"}'
```

---

## 🗄️ MENGHUBUNGKAN KE DATABASE (PostgreSQL)

### Step 1: Install Database Package

```bash
npm install pg
```

### Step 2: Buat File Database Config

Buat file baru `database.js`:

```javascript
// database.js
const { Pool } = require('pg');

// Konfigurasi koneksi database
const pool = new Pool({
  host: 'localhost',      // Ganti dengan host database Anda
  port: 5432,             // Port default PostgreSQL
  database: 'ewallet_db', // Nama database
  user: 'postgres',       // Username database
  password: 'password',   // Password database
  max: 20,                // Maksimal koneksi dalam pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test koneksi
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

module.exports = pool;
```

### Step 3: Buat Tabel di PostgreSQL

Jalankan SQL ini di database Anda:

```sql
-- Buat tabel users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    ewallet_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data contoh
INSERT INTO users (phone_number, nickname, ewallet_type) VALUES
('081234567890', 'Budi Santoso', 'GoPay'),
('081298765432', 'Siti Aisyah', 'ShopeePay'),
('085678901234', 'Agus Wijaya', 'DANA')
ON CONFLICT (phone_number) DO NOTHING;

-- Buat index untuk pencarian cepat
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_ewallet ON users(ewallet_type);
```

### Step 4: Update API Endpoint dengan Database Real

Update `server.js`:

```javascript
// server.js - Versi dengan Database
const express = require('express');
const pool = require('./database'); // Import database

const app = express();
app.use(express.json());

// API Key middleware (sama seperti sebelumnya)
const VALID_API_KEYS = ['api_key_production_12345'];

function verifyApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !VALID_API_KEYS.includes(apiKey)) {
    return res.status(401).json({ success: false, message: 'Invalid API Key' });
  }
  next();
}

// ============================================
// ENDPOINT CEK NICKNAME (DENGAN DATABASE)
// ============================================
app.post('/api/check-nickname', verifyApiKey, async (req, res) => {
  const { phone, ewallet } = req.body;
  
  if (!phone || !ewallet) {
    return res.status(400).json({
      success: false,
      message: 'Parameter phone dan ewallet wajib diisi'
    });
  }
  
  try {
    // Query database
    const query = `
      SELECT nickname, phone_number, ewallet_type 
      FROM users 
      WHERE phone_number = $1 AND ewallet_type = $2
    `;
    
    const result = await pool.query(query, [phone, ewallet]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      return res.json({
        success: true,
        data: {
          nickname: user.nickname,
          phone: user.phone_number,
          ewallet: user.ewallet_type
        }
      });
    }
    
    return res.status(404).json({
      success: false,
      message: `Nickname untuk ${ewallet} dengan nomor ${phone} tidak ditemukan`
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
});

// ============================================
// ENDPOINT UNTUK MENYIMPAN HISTORY PENGECEKAN
// ============================================
app.post('/api/check-with-history', verifyApiKey, async (req, res) => {
  const { phone, ewallet } = req.body;
  const startTime = Date.now();
  
  try {
    // Cek user
    const userQuery = `
      SELECT nickname, phone_number, ewallet_type 
      FROM users WHERE phone_number = $1 AND ewallet_type = $2
    `;
    const userResult = await pool.query(userQuery, [phone, ewallet]);
    
    const responseTime = Date.now() - startTime;
    
    // Simpan history
    const historyQuery = `
      INSERT INTO check_history (phone_number, ewallet_type, status, response_time_ms, checked_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;
    const status = userResult.rows.length > 0 ? 'found' : 'not_found';
    await pool.query(historyQuery, [phone, ewallet, status, responseTime]);
    
    if (userResult.rows.length > 0) {
      return res.json({
        success: true,
        data: {
          nickname: userResult.rows[0].nickname,
          phone: userResult.rows[0].phone_number,
          ewallet: userResult.rows[0].ewallet_type
        },
        meta: { response_time_ms: responseTime }
      });
    }
    
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan',
      meta: { response_time_ms: responseTime }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
```

---

## 🧪 TESTING API ENDPOINT

### Buat File Test

Buat file `test-api.js`:

```javascript
// test-api.js
const axios = require('axios');

const API_URL = 'http://localhost:3000';
const API_KEY = 'api_key_production_12345';

async function testAPI() {
  console.log('🧪 Testing API Endpoint\n');
  
  // Test 1: Check nickname (sukses)
  console.log('Test 1: Check nickname (existing user)');
  try {
    const response = await axios.post(`${API_URL}/api/check-nickname`, 
      { phone: '081234567890', ewallet: 'GoPay' },
      { headers: { 'X-API-Key': API_KEY } }
    );
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
  }
  
  console.log('\n---\n');
  
  // Test 2: Check nickname (user tidak ada)
  console.log('Test 2: Check nickname (non-existing user)');
  try {
    const response = await axios.post(`${API_URL}/api/check-nickname`,
      { phone: '089999999999', ewallet: 'GoPay' },
      { headers: { 'X-API-Key': API_KEY } }
    );
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.log('❌ Failed (expected):', error.response?.data);
  }
  
  console.log('\n---\n');
  
  // Test 3: Tanpa API Key (harus gagal)
  console.log('Test 3: Without API Key (should fail)');
  try {
    const response = await axios.post(`${API_URL}/api/check-nickname`,
      { phone: '081234567890', ewallet: 'GoPay' }
    );
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.log('❌ Failed as expected:', error.response?.data);
  }
}

testAPI();
```

Jalankan test:

```bash
npm install axios
node test-api.js
```

---

## 🚀 DEPLOY API ENDPOINT KE SERVER

### Option 1: Deploy ke VPS (DigitalOcean, Vultr, dll)

```bash
# 1. SSH ke VPS Anda
ssh root@your-server-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Clone atau upload kode Anda
git clone https://github.com/your-username/my-api.git
cd my-api

# 4. Install dependencies
npm install

# 5. Install PM2 (process manager)
npm install -g pm2

# 6. Jalankan API dengan PM2
pm2 start server.js --name my-api
pm2 save
pm2 startup

# 7. Install Nginx (reverse proxy)
sudo apt install -y nginx

# 8. Konfigurasi Nginx
sudo nano /etc/nginx/sites-available/api

# Isi dengan:
server {
    listen 80;
    server_name api.domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# 9. Aktifkan konfigurasi
sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. Setup SSL (HTTPS)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.domain.com
```

### Option 2: Deploy ke Railway (Termudah & Gratis)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login Railway
railway login

# 3. Inisialisasi proyek
railway init

# 4. Deploy
railway up

# 5. Set environment variables
railway variables set API_KEY=your_api_key_here
```

### Option 3: Deploy ke Render (Gratis)

1. Push kode ke GitHub
2. Buka [render.com](https://render.com)
3. Pilih "New Web Service"
4. Hubungkan repository GitHub Anda
5. Set:
   - Build Command: `npm install`
   - Start Command: `node server.js`
6. Klik "Create Web Service"

---

## 📝 RINGKASAN SEMUA ENDPOINT YANG TELAH DIBUAT

| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| GET | `/` | Cek API berjalan | ❌ |
| GET | `/health` | Health check | ❌ |
| GET | `/hello` | Test endpoint | ❌ |
| POST | `/sapa` | Menyapa user | ❌ |
| POST | `/api/check-nickname` | Cek nickname | ✅ (API Key) |
| POST | `/api/batch-check` | Cek banyak nickname | ✅ (API Key) |
| POST | `/api/add-user` | Tambah user baru | ✅ (API Key) |
| POST | `/api/check-with-history` | Cek dengan history | ✅ (API Key) |

---

## ❓ FAQ - MASALAH UMUM

### Q: Error "port already in use"

```bash
# Cari proses yang menggunakan port 3000
lsof -i :3000

# Kill proses
kill -9 [PID]

# Atau ganti port di kode
const PORT = 3001; // Ganti dengan port lain
```

### Q: Error "Cannot find module 'express'"

```bash
# Install ulang dependencies
rm -rf node_modules package-lock.json
npm install
```

### Q: API tidak meresponse (timeout)

```bash
# Cek apakah server berjalan
ps aux | grep node

# Cek log error
pm2 logs

# Restart server
pm2 restart my-api
```

### Q: Database connection failed

```bash
# Cek PostgreSQL berjalan
sudo systemctl status postgresql

# Test koneksi
psql -h localhost -U postgres -d your_database -c "SELECT 1"
```

---

## 🎯 NEXT STEP: INTEGRASI E-WALLET REAL

Setelah API endpoint dasar Anda berhasil, untuk integrasi ke e-wallet REAL Anda perlu:

1. **Daftar sebagai merchant** di DANA/ShopeePay (proses 2-3 bulan)
2. **Dapatkan Client ID & Secret** dari mereka
3. **Implementasikan OAuth flow** (contoh kode sudah saya berikan sebelumnya)

**Saran:**
- Gunakan API yang sudah Anda buat ini untuk **simulasi/testing** dulu
- Sambil menunggu persetujuan dari DANA/ShopeePay, Anda bisa develop fitur lainnya
- Setelah dapat akses resmi, Anda tinggal mengganti database dummy dengan API call ke e-wallet

---

**Selamat! Anda sekarang bisa membuat API endpoint sendiri!** 🎉

Ada yang ingin ditanyakan tentang step-step di atas?