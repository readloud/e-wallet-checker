### Step 1: Generate Encryption Keys

```bash
# Generate RSA keys for DANA
openssl genrsa -out dana_private_key.pem 2048
openssl rsa -in dana_private_key.pem -pubout -out dana_public_key.pem

# Generate encryption keys for token storage
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Setup Database

```bash
# Create database
createdb -U postgres ewallet_oauth_prod

# Run migrations
npm run migrate

# Seed initial data (optional)
npm run db:seed
```

### Step 3: Configure Environment

```bash
cp .env.example .env.production
nano .env.production  # Edit with your credentials
```

### Step 4: Install Dependencies

```bash
npm ci --only=production
```

### Step 5: Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 6: Nginx Configuration

```nginx
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
    }
}
```

---

## 📋 Summary: Apa yang Berbeda dengan Versi Demo?

| Aspek | Versi Demo Sebelumnya | Versi Production Real |
|-------|----------------------|----------------------|
| **Data Source** | Database lokal (dummy) | DANA & ShopeePay API real |
| **Authentication** | API Key sederhana | JWT + Session + OAuth |
| **Dapat Data User** | Langsung dari DB | User harus login & grant consent |
| **Biaya** | Gratis | Perlu kerjasama resmi |
| **Legal** | Bebas | Perlu kontrak komersial |
| **Cek Nomor HP Sembarang** | ✅ Bisa | ❌ TIDAK BISA (user harus login) |
| **Cek Data User Sendiri** | ❌ Tidak | ✅ Bisa (setelah user consent) |

---