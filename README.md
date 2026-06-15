# E-Wallet OAuth Integration - DANA & ShopeePay API

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/express-4.18.x-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-15.x-blue.svg)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/redis-7.x-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 📋 Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur](#fitur)
- [Arsitektur](#arsitektur)
- [Prasyarat](#prasyarat)
- [Instalasi Lokal](#instalasi-lokal)
- [Deployment ke AWS](#deployment-ke-aws)
- [Deployment ke GCP](#deployment-ke-gcp)
- [Konfigurasi Environment](#konfigurasi-environment)
- [API Dokumentasi](#api-dokumentasi)
- [Troubleshooting](#troubleshooting)
- [Monitoring](#monitoring)
- [Security](#security)

## 🎯 Tentang Proyek

API ini menyediakan integrasi OAuth 2.0 dengan **DANA** dan **ShopeePay** untuk mendapatkan nickname/profil pengguna setelah user memberikan consent.

### Yang Bisa Dilakukan:
- ✅ User login ke aplikasi Anda
- ✅ User menghubungkan akun DANA/ShopeePay
- ✅ Mendapatkan nickname, nama lengkap, email pengguna
- ✅ Menyimpan token dengan aman (AES-256-GCM encrypted)

### Yang TIDAK Bisa Dilakukan:
- ❌ Cek nickname hanya dengan nomor HP (user harus login & consent)
- ❌ Transaksi pembayaran (gunakan QRIS untuk ini)

## 🏗 Arsitektur

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   AWS ALB   │────▶│  EC2/ECS    │────▶│  RDS        │
│  (Web App)  │     │  / GCP LB   │     │  (Node.js)  │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └──────┬──────┘     └─────────────┘
                                               │
                                        ┌──────▼──────┐
                                        │   ElastiCache│
                                        │   / Memorystore│
                                        │   (Redis)    │
                                        └─────────────┘
```

## 📋 Prasyarat

### Local Development
- Node.js 20+ 
- PostgreSQL 15+
- Redis 7+
- OpenSSL (untuk generate keys)

### Deployment (AWS/GCP)
- AWS Account / GCP Project
- Domain name (untuk callback URL)
- SSL Certificate (HTTPS required)

## 🚀 Instalasi Lokal

### 1. Clone Repository

```bash
git clone https://github.com/your-username/ewallet-oauth-integration.git
cd ewallet-oauth-integration
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate RSA Keys untuk DANA

```bash
# Buat folder keys
mkdir keys

# Generate Private Key PKCS#1
openssl genrsa -out keys/dana_private_key.pem 2048

# Convert ke PKCS#8 (required by DANA)
openssl pkcs8 -topk8 -in keys/dana_private_key.pem \
  -out keys/dana_private_key_pkcs8.pem -nocrypt

# Generate Public Key
openssl rsa -in keys/dana_private_key.pem \
  -pubout -out keys/dana_public_key.pem
```

### 4. Setup Database PostgreSQL

```bash
# Create database
createdb -U postgres ewallet_oauth

# Run migrations
npm run migrate
```

### 5. Setup Environment

```bash
cp .env.example .env.development
nano .env.development  # Edit dengan konfigurasi lokal
```

### 6. Jalankan Aplikasi

```bash
# Development mode
npm run dev

# Production mode
npm run prod
```

## ☁️ Deployment ke AWS

### Option 1: EC2 (Manual)

#### Step 1: Launch EC2 Instance

```bash
# AMI: Ubuntu 22.04 LTS
# Instance type: t3.medium (minimum)
# Security Group: 
#   - SSH (22) from your IP
#   - HTTP (80) from 0.0.0.0/0
#   - HTTPS (443) from 0.0.0.0/0
#   - Custom (3000) from internal
```

#### Step 2: Install Dependencies on EC2

```bash
# SSH ke EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql-15 postgresql-contrib-15

# Install Redis
sudo apt install -y redis-server

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

#### Step 3: Setup Database

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE ewallet_oauth;
CREATE USER ewallet_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE ewallet_oauth TO ewallet_user;
EOF
```

#### Step 4: Deploy Application

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/your-username/ewallet-oauth-integration.git
sudo chown -R ubuntu:ubuntu ewallet-oauth-integration
cd ewallet-oauth-integration

# Install dependencies
npm ci --only=production

# Generate keys
mkdir keys
openssl genrsa -out keys/dana_private_key.pem 2048
openssl pkcs8 -topk8 -in keys/dana_private_key.pem \
  -out keys/dana_private_key_pkcs8.pem -nocrypt

# Setup environment
cp .env.example .env.production
nano .env.production  # Edit with production values

# Run migrations
npm run migrate

# Start with PM2
pm2 start server.js --name ewallet-oauth
pm2 save
pm2 startup
```

#### Step 5: Configure Nginx

```nginx
# /etc/nginx/sites-available/ewallet-oauth
server {
    listen 80;
    server_name api.ewallet.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.ewallet.com;
    
    ssl_certificate /etc/nginx/ssl/api.ewallet.com.crt;
    ssl_certificate_key /etc/nginx/ssl/api.ewallet.com.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_buffering off;
        proxy_read_timeout 60s;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ewallet-oauth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 6: Setup SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.ewallet.com
```

### Option 2: ECS (Container)

#### Dockerfile (already provided)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN mkdir keys

USER node
EXPOSE 3000

CMD ["node", "server.js"]
```

#### Build and Push to ECR

```bash
# Build image
docker build -t ewallet-oauth .

# Tag for ECR
aws ecr create-repository --repository-name ewallet-oauth
docker tag ewallet-oauth:latest \
  <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/ewallet-oauth:latest

# Push to ECR
aws ecr get-login-password | docker login \
  --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com
docker push <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/ewallet-oauth:latest
```

### Option 3: RDS & ElastiCache Setup

```bash
# Create RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier ewallet-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --allocated-storage 20 \
  --master-username ewallet_admin \
  --master-user-password YourStrongPassword \
  --vpc-security-group-ids sg-xxxxx

# Create ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id ewallet-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

## ☁️ Deployment ke GCP

### Option 1: Compute Engine

```bash
# Create VM Instance
gcloud compute instances create ewallet-api \
  --zone=asia-southeast2-a \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server,https-server

# SSH to VM
gcloud compute ssh ewallet-api --zone=asia-southeast2-a

# Follow same steps as EC2 above
```

### Option 2: Cloud Run (Serverless)

```yaml
# service.yaml untuk Cloud Run
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ewallet-oauth-api
spec:
  template:
    spec:
      containers:
      - image: gcr.io/your-project/ewallet-oauth:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          value: "cloudsql-connection"
        - name: REDIS_HOST
          value: "redis-memorystore"
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
```

```bash
# Deploy ke Cloud Run
gcloud run deploy ewallet-oauth-api \
  --image gcr.io/your-project/ewallet-oauth:latest \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1
```

### Option 3: Cloud SQL & Memorystore

```bash
# Create Cloud SQL PostgreSQL
gcloud sql instances create ewallet-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-1-3840 \
  --region=asia-southeast2 \
  --root-password=YourStrongPassword

# Create database
gcloud sql databases create ewallet_oauth --instance=ewallet-db

# Create Memorystore Redis
gcloud redis instances create ewallet-cache \
  --size=1 \
  --region=asia-southeast2 \
  --redis-version=redis_7_x
```

## ⚙️ Konfigurasi Environment

### `.env.production` untuk AWS/GCP

```env
# ============================================
# APP CONFIGURATION
# ============================================
NODE_ENV=production
PORT=3000
APP_NAME="E-Wallet OAuth API"
APP_URL=https://api.ewallet.com

# ============================================
# DATABASE (AWS RDS / GCP Cloud SQL)
# ============================================
DB_HOST=your-db-endpoint.aws.com  # atau localhost jika di VM
DB_PORT=5432
DB_NAME=ewallet_oauth
DB_USER=ewallet_user
DB_PASSWORD=your_strong_password
DB_POOL_MAX=20
DB_POOL_MIN=2

# ============================================
# REDIS (AWS ElastiCache / GCP Memorystore)
# ============================================
REDIS_HOST=your-redis-endpoint.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB_SESSION=0
REDIS_DB_CACHE=1

# ============================================
# JWT & SESSION
# ============================================
SESSION_SECRET=your_session_secret_min_32_chars_here
JWT_SECRET=your_jwt_secret_min_32_chars_here
JWT_EXPIRES_IN=7d

# ============================================
# DANA (Sandbox dulu, ganti ke production setelah UAT)
# ============================================
DANA_ENVIRONMENT=sandbox
DANA_CLIENT_ID=your_dana_client_id_from_onboarding
DANA_CLIENT_SECRET=your_dana_client_secret
DANA_PRIVATE_KEY_PATH=./keys/dana_private_key_pkcs8.pem
DANA_PUBLIC_KEY_PATH=./keys/dana_public_key.pem
DANA_REDIRECT_URL=https://api.ewallet.com/api/v1/dana/callback
DANA_API_BASE=https://api-sandbox.saas.dana.id
DANA_OAUTH_BASE=https://sandbox.m.dana.id

# ============================================
# SHOPEEPAY (Sandbox dulu)
# ============================================
SHOPEEPAY_ENVIRONMENT=sandbox
SHOPEEPAY_MERCHANT_ID=your_shopeepay_merchant_id
SHOPEEPAY_SECRET_KEY=your_shopeepay_secret_key
SHOPEEPAY_REDIRECT_URL=https://api.ewallet.com/api/v1/shopeepay/callback
SHOPEEPAY_API_BASE=https://api.uat.wallet.airpay.co.id
SHOPEEPAY_OAUTH_BASE=https://pay-shopeepay-uat.airpay.co.id

# ============================================
# ENCRYPTION (WAJIB 32 karakter)
# ============================================
TOKEN_ENCRYPTION_KEY=32_char_encryption_key_for_tokens_here

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info
LOG_DIR=/var/log/ewallet-oauth
```

## 📖 API Dokumentasi

### Authentication

Semua endpoint (kecuali /auth/register, /auth/login, dan /callback) memerlukan JWT token:

```http
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### 1. Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "phone_number": "6281234567890",
  "password": "securepassword123",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "phone_number": "6281234567890",
      "full_name": "John Doe"
    },
    "token": "jwt_token_here"
  }
}
```

#### 2. Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

#### 3. Connect DANA

```http
GET /api/v1/dana/connect
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "redirect_url": "https://sandbox.m.dana.id/m/portal/oauth?client_id=...",
  "state": "random_state_string"
}
```

**Alur:** Redirect user ke `redirect_url` → User login DANA → User consent → Redirect ke callback Anda.

#### 4. Get DANA Profile (Nickname)

```http
GET /api/v1/dana/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nickname": "johndoe",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+6281234567890",
    "profilePicture": "https://...",
    "publicUserId": "20180626111215830192"
  }
}
```

#### 5. Connect ShopeePay

```http
POST /api/v1/shopeepay/connect
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone_number": "6281234567890"
}
```

#### 6. Get ShopeePay Profile (Nickname)

```http
GET /api/v1/shopeepay/profile
Authorization: Bearer <token>
```

#### 7. Disconnect

```http
DELETE /api/v1/dana/disconnect
Authorization: Bearer <token>
```

```http
DELETE /api/v1/shopeepay/disconnect
Authorization: Bearer <token>
```

### Testing dengan cURL

```bash
# 1. Register
curl -X POST https://api.ewallet.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phone_number":"6281234567890","password":"test123","full_name":"Test User"}'

# 2. Login
curl -X POST https://api.ewallet.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 3. Connect DANA (gunakan token dari response login)
curl -X GET https://api.ewallet.com/api/v1/dana/connect \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Get DANA Profile
curl -X GET https://api.ewallet.com/api/v1/dana/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Troubleshooting

### Issue 1: DANA OAuth Callback "Invalid state parameter"

**Penyebab:** State tidak match antara yang disimpan dan yang dikembalikan.

**Solusi:**
```javascript
// Pastikan session Redis berfungsi
redisClient.ping() // Harus return "PONG"

// Check state di database
SELECT * FROM oauth_states WHERE state = 'xxx' AND expires_at > NOW();
```

### Issue 2: DANA Signature Error (X-SIGNATURE)

**Penyebab:** Private key format salah atau timestamp expired.

**Solusi:**
```bash
# Check private key format
openssl rsa -in keys/dana_private_key_pkcs8.pem -check

# Ensure server time is synced
sudo apt install ntp
sudo systemctl start ntp
sudo ntpq -p

# Check timestamp format
date -Iseconds  # Format yang benar: 2024-01-15T10:30:00+07:00
```

### Issue 3: ShopeePay "Merchant ID not found"

**Penyebab:** Merchant ID belum terdaftar atau environment salah.

**Solusi:**
```bash
# Pastikan menggunakan sandbox untuk development
SHOPEEPAY_ENVIRONMENT=sandbox

# Check merchant ID di dashboard ShopeePay
# Hubungi support ShopeePay jika masih error
```

### Issue 4: Database Connection Timeout (AWS/GCP)

**Penyebab:** Security Group tidak mengizinkan koneksi.

**Solusi AWS:**
```bash
# Add inbound rule ke Security Group RDS
# Type: PostgreSQL, Port: 5432, Source: EC2 Security Group ID

# Test connection
psql -h your-db-endpoint -U ewallet_user -d ewallet_oauth
```

**Solusi GCP:**
```bash
# Authorize Cloud SQL connection
gcloud sql instances patch ewallet-db \
  --authorized-networks=YOUR_VM_EXTERNAL_IP

# Or use Cloud SQL Proxy (lebih aman)
./cloud_sql_proxy -instances=your-project:asia-southeast2:ewallet-db=tcp:5432
```

### Issue 5: Redis Connection Refused

**Penyebab:** Redis bind ke localhost only atau password salah.

**Solusi:**
```bash
# Check Redis config
sudo nano /etc/redis/redis.conf

# Ubah bind dari 127.0.0.1 menjadi 0.0.0.0 (untuk internal network)
bind 0.0.0.0

# Set password
requirepass your_strong_password

# Restart Redis
sudo systemctl restart redis-server

# Test connection
redis-cli -h your-redis-host -p 6379 -a your_password ping
```

### Issue 6: OAuth Callback URL Tidak Bisa Localhost di Production

**Penyebab:** DANA/ShopeePay hanya menerima HTTPS domain.

**Solusi:**
```bash
# Gunakan domain dengan SSL
DANA_REDIRECT_URL=https://api.ewallet.com/api/v1/dana/callback

# Untuk testing lokal, gunakan ngrok
ngrok http 3000
# Gunakan URL ngrok untuk callback
```

### Issue 7: Token Expired

**Penyebab:** Token DANA kadaluarsa setelah beberapa waktu.

**Solusi:**
```javascript
// Auto refresh token
async function getValidToken(userId) {
  let token = await tokenService.getUserToken(userId, 'dana');
  
  if (token.expires_at && new Date(token.expires_at) < new Date()) {
    // Refresh token
    const newToken = await danaService.refreshAccessToken(token.refresh_token);
    await tokenService.saveDANAToken(userId, newToken);
    token = await tokenService.getUserToken(userId, 'dana');
  }
  
  return token;
}
```

### Issue 8: PM2 Process Dies

**Penyebab:** Memory limit atau unhandled exception.

**Solusi:**
```bash
# Check PM2 logs
pm2 logs ewallet-oauth --lines 100

# Restart with more memory
pm2 start server.js --name ewallet-oauth --max-memory-restart 500M

# Setup auto-restart on crash
pm2 start server.js --name ewallet-oauth --restart-delay=3000
```

## 📊 Monitoring

### Health Check Endpoint

```bash
curl https://api.ewallet.com/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "services": {
    "dana": "sandbox",
    "shopeepay": "sandbox"
  }
}
```

### Log Monitoring

```bash
# PM2 logs
pm2 logs ewallet-oauth --lines 50

# Application logs
tail -f /var/log/ewallet-oauth/combined.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

### AWS CloudWatch Setup

```bash
# Install CloudWatch agent
sudo wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### GCP Cloud Monitoring

```bash
# Install Ops Agent
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
```

## 🔒 Security Checklist

### Production Requirements

- [ ] HTTPS enabled (Let's Encrypt / CloudFlare)
- [ ] Environment variables not hardcoded
- [ ] Database password strong (min 16 chars, special chars)
- [ ] Redis password set
- [ ] JWT secret changed from default
- [ ] Session secret changed from default
- [ ] TOKEN_ENCRYPTION_KEY is 32 chars
- [ ] API rate limiting enabled
- [ ] Database backups configured (daily)
- [ ] Security group only allows necessary ports
- [ ] Regular security updates (weekly)
- [ ] Audit logging enabled

### Database Backup

```bash
# AWS RDS - Automatic backup enabled
# GCP Cloud SQL - Automatic backup enabled

# Manual backup
pg_dump -h your-db-endpoint -U ewallet_user ewallet_oauth > backup_$(date +%Y%m%d).sql

# Restore
psql -h your-db-endpoint -U ewallet_user ewallet_oauth < backup_20240115.sql
```

## 🚨 Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 400 | Invalid request body | Check JSON format and required fields |
| 401 | Invalid/Expired token | Re-login to get new token |
| 404 | DANA/ShopeePay not connected | Connect account first |
| 429 | Rate limit exceeded | Wait and retry |
| 500 | Internal server error | Check logs |
| 1001 | DANA signature error | Check private key and timestamp |
| 1002 | DANA token expired | Reconnect DANA |
| 2001 | ShopeePay binding failed | Retry with valid phone number |

## 📞 Support

Jika mengalami masalah:

1. Check [Troubleshooting](#troubleshooting) section
2. Check logs: `pm2 logs ewallet-oauth`
3. Test connectivity: `curl https://api.ewallet.com/health`
4. Contact: support@ewallet.com