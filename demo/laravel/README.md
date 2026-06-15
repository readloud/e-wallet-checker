# E-Wallet Nickname Checker API - Laravel Production

[![Laravel Version](https://img.shields.io/badge/laravel-10.x-red.svg)](https://laravel.com)
[![PHP Version](https://img.shields.io/badge/php-%3E%3D8.1-blue.svg)](https://php.net)
[![MySQL/PostgreSQL](https://img.shields.io/badge/database-postgresql%20%7C%20mysql-blue.svg)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 📋 Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Requirements](#requirements)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Dokumentasi API](#dokumentasi-api)
- [Queue & Jobs](#queue--jobs)
- [Caching Strategy](#caching-strategy)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)
- [Security](#security)
- [Performance Optimization](#performance-optimization)
- [Testing](#testing)
- [FAQ](#faq)

## 🎯 Tentang Proyek

**E-Wallet Nickname Checker API** dengan Laravel 10 - solusi enterprise-ready untuk pengecekan nama akun e-wallet terintegrasi dengan sistem antrian, caching, dan monitoring lengkap.

### Fitur Enterprise

- 🏢 **Queue System** dengan Laravel Horizon
- 📊 **Real-time Monitoring** dengan Laravel Telescope
- 🔄 **Job Batching** untuk pemrosesan massal
- 💾 **Multi-database** support (PostgreSQL/MySQL)
- 🚀 **Octane** untuk performa super cepat
- 📝 **Activity Logging** dengan Spatie
- 🔐 **Role-based Access Control** (RBAC)
- 📧 **Email Notifications** untuk alert

## ✨ Fitur Utama

### Core Features
- ✅ RESTful API dengan Laravel
- ✅ Queue system untuk batch processing
- ✅ Redis caching dengan tag
- ✅ Rate limiting dengan throttle middleware
- ✅ API Key authentication
- ✅ Request/Response logging
- ✅ Database query optimization
- ✅ Lazy loading prevention
- ✅ N+1 query detection

### Advanced Features
- 🔄 **Horizon** untuk queue management
- 🔍 **Telescope** untuk request monitoring
- 💾 **Database Backup** otomatis
- 📊 **Performance Profiling**
- 🚦 **Circuit Breaker** pattern
- 📈 **Metrics Export** ke Prometheus

## 📋 Requirements

| Requirement | Version | Keterangan |
|-------------|---------|------------|
| PHP | ≥ 8.1 | Dengan extensions: BCMath, Ctype, JSON, Mbstring, OpenSSL, PDO, Tokenizer, XML |
| Composer | ≥ 2.x | Dependency manager |
| PostgreSQL | ≥ 14.x atau MySQL ≥ 8.0 | Database utama |
| Redis | ≥ 7.x | Cache, session, queue driver |
| Supervisor | ≥ 4.x | Process monitor untuk queue worker |
| Nginx | ≥ 1.20 | Web server |
| Node.js & NPM | ≥ 18.x | Untuk asset compilation (opsional) |

## 🚀 Instalasi

### 1. Clone & Setup

```bash
# Clone repository
git clone https://github.com/readloud/ewallet-checker-laravel.git
cd ewallet-checker-laravel

# Install dependencies
composer install --optimize-autoloader --no-dev

# Copy environment file
cp .env.production .env

# Generate application key
php artisan key:generate

# Create storage link
php artisan storage:link
```

### 2. Database Setup

```bash
# Create database
createdb -U postgres ewallet_prod

# Run migrations
php artisan migrate --force

# Seed dummy data
php artisan db:seed --class=WalletUserSeeder --force

# Run database optimization
php artisan db:optimize
```

### 3. Redis & Queue Setup

```bash
# Install Redis driver
composer require predis/predis

# Configure Horizon
php artisan horizon:install

# Publish Horizon assets
php artisan vendor:publish --tag=laravel-horizon

# Start Horizon (production)
php artisan horizon
```

### 4. Install Telescope (Monitoring)

```bash
# Install Telescope
composer require laravel/telescope

# Publish Telescope assets
php artisan telescope:install

# Run migrations
php artisan migrate

# Start Telescope
php artisan telescope:publish
```

## ⚙ Konfigurasi

### `.env.production`

```env
# ============================================
# APPLICATION
# ============================================
APP_NAME="E-Wallet Checker API"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.ewallet.com
APP_TIMEZONE=Asia/Jakarta
APP_LOCALE=id

# ============================================
# LOGGING
# ============================================
LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=warning
LOG_SLACK_WEBHOOK_URL=your_slack_webhook

# ============================================
# DATABASE (PostgreSQL)
# ============================================
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ewallet_prod
DB_USERNAME=ewallet_user
DB_PASSWORD=secure_password_here

# Read replica (optional)
DB_READ_HOST=read-replica.example.com
DB_READ_PORT=5432
DB_READ_DATABASE=ewallet_prod
DB_READ_USERNAME=ewallet_readonly
DB_READ_PASSWORD=readonly_password

# ============================================
# CACHE & SESSION
# ============================================
CACHE_DRIVER=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=strict

# ============================================
# REDIS
# ============================================
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=redis_password_here
REDIS_PORT=6379
REDIS_CLIENT=predis
REDIS_CACHE_DB=0
REDIS_SESSION_DB=1
REDIS_QUEUE_DB=2
REDIS_HORIZON_DB=3

# Redis cluster (optional)
REDIS_CLUSTER=true
REDIS_CLUSTER_SEEDS="10.0.0.1:6379,10.0.0.2:6379,10.0.0.3:6379"

# ============================================
# QUEUE
# ============================================
QUEUE_CONNECTION=redis

# ============================================
# BROADCASTING
# ============================================
BROADCAST_DRIVER=redis
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001

# ============================================
# SECURITY
# ============================================
API_KEY_HEADER=X-API-Key
API_KEY=your_super_secret_api_key_here

# CORS
CORS_ALLOWED_ORIGINS=https://ewallet.com,https://admin.ewallet.com
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,X-API-Key,Authorization

# Trusted proxies
TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMITER_ENABLED=true
RATE_LIMITER_ATTEMPTS=60
RATE_LIMITER_DECAY=60
RATE_LIMITER_WINDOW=60

# ============================================
# SERVICES
# ============================================
SENTRY_LARAVEL_DSN=your_sentry_dsn
SENTRY_TRACES_SAMPLE_RATE=0.1

NEW_RELIC_APP_NAME="E-Wallet API"
NEW_RELIC_LICENSE_KEY=your_newrelic_key

# ============================================
# BACKUP
# ============================================
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_DESTINATION= s3
BACKUP_S3_BUCKET=ewallet-backups
BACKUP_S3_PATH=laravel/

# ============================================
# MAIL (untuk notifikasi)
# ============================================
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=alerts@ewallet.com
MAIL_PASSWORD=your_email_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@ewallet.com
MAIL_FROM_NAME="E-Wallet System"

ADMIN_EMAILS=admin@ewallet.com,tech@ewallet.com
```

### Konfigurasi Horizon (`config/horizon.php`)

```php
<?php

return [
    'environments' => [
        'production' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue' => ['high', 'default', 'low', 'batch'],
                'balance' => 'auto',
                'autoScaling' => true,
                'processes' => 10,
                'tries' => 3,
                'timeout' => 60,
                'memory' => 128,
                'nice' => 0,
            ],
            
            'supervisor-2' => [
                'connection' => 'redis',
                'queue' => ['critical'],
                'balance' => 'simple',
                'processes' => 4,
                'tries' => 5,
                'timeout' => 300,
            ],
        ],
    ],
];
```

## 🏃 Menjalankan Aplikasi

### Production Stack dengan Supervisor

#### 1. Setup Nginx

```nginx
# /etc/nginx/sites-available/ewallet-api
server {
    listen 80;
    server_name api.ewallet.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.ewallet.com;
    
    root /var/www/ewallet-laravel/public;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~ /\.ht {
        deny all;
    }
}
```

#### 2. Setup Supervisor untuk Queue

```ini
# /etc/supervisor/conf.d/laravel-worker.conf
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/ewallet-laravel/artisan horizon
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/log/laravel-worker.log
stopwaitsecs=3600
```

#### 3. Setup Systemd untuk Octane (Opsional - Performa Tinggi)

```ini
# /etc/systemd/system/laravel-octane.service
[Unit]
Description=Laravel Octane
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ewallet-laravel
ExecStart=/usr/bin/php artisan octane:start --server=swoole --host=127.0.0.1 --port=8000
ExecReload=/usr/bin/php artisan octane:reload
Restart=always

[Install]
WantedBy=multi-user.target
```

#### 4. Start Services

```bash
# Start PHP-FPM
sudo systemctl start php8.2-fpm
sudo systemctl enable php8.2-fpm

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Start Supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-worker:*

# Start Octane (optional)
sudo systemctl start laravel-octane
sudo systemctl enable laravel-octane

# Start Horizon
php artisan horizon:terminate
php artisan horizon
```

## 📖 Dokumentasi API

### Authentication

Semua request harus menyertakan API Key:

```http
X-API-Key: your_api_key_here
```

### Endpoints

#### 1. Cek Nickname

```http
POST /api/check
```

**Request:**
```json
{
  "identifier": "081234567890",
  "walletType": "gopay"
}
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "nickname": "Budi Santoso",
    "phone": "081234567890",
    "ewallet": "GoPay"
  },
  "meta": {
    "execution_time_ms": 45.23,
    "cache_hit": false,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 2. Batch Check (Queue Job)

```http
POST /api/batch-check
```

**Request:**
```json
{
  "identifiers": ["081234567890", "081298765432", "085678901234"],
  "walletType": "gopay",
  "callback_url": "https://webhook.site/your-callback"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch job submitted",
  "job_id": "batch_550e8400-e29b-41d4-a716-446655440000",
  "estimated_completion": "2024-01-15T10:35:00.000Z"
}
```

#### 3. Check Batch Status

```http
GET /api/batch-status/{job_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "total": 3,
    "processed": 3,
    "results": [...]
  }
}
```

## 🔄 Queue & Jobs

### Membuat Job Baru

```bash
php artisan make:job BatchWalletCheck
```

### Job Example

```php
<?php

namespace App\Jobs;

use App\Models\WalletUser;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class BatchWalletCheck implements ShouldQueue
{
    use Dispatchable;
    
    public $timeout = 120;
    public $tries = 3;
    public $backoff = [5, 10, 30];
    
    protected $identifiers;
    protected $walletType;
    
    public function handle()
    {
        $results = [];
        
        foreach ($this->identifiers as $identifier) {
            $user = WalletUser::where('phone_number', $identifier)
                ->where('ewallet_type', $this->walletType)
                ->first();
                
            $results[$identifier] = $user ? $user->nickname : null;
        }
        
        Redis::setex("batch:{$this->job->getJobId()}", 3600, json_encode($results));
        
        Log::info('Batch completed', ['job_id' => $this->job->getJobId()]);
    }
}
```

## 💾 Caching Strategy

### Multi-level Cache

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use App\Models\WalletUser;

class WalletCacheService
{
    // L1 Cache (Redis) - 5 minutes
    const L1_TTL = 300;
    
    // L2 Cache (Database) - 1 hour
    const L2_TTL = 3600;
    
    public function get($identifier, $walletType)
    {
        $key = "user:{$identifier}:{$walletType}";
        
        // Try L1 cache
        $cached = Cache::get($key);
        if ($cached) {
            return $cached;
        }
        
        // Try database with cache
        $user = Cache::remember($key, self::L1_TTL, function () use ($identifier, $walletType) {
            return WalletUser::where('phone_number', $identifier)
                ->where('ewallet_type', $walletType)
                ->first();
        });
        
        return $user;
    }
    
    // Cache warming
    public function warmUp($identifiers)
    {
        foreach ($identifiers as $identifier) {
            $users = WalletUser::whereIn('phone_number', $identifiers)->get();
            
            foreach ($users as $user) {
                $key = "user:{$user->phone_number}:{$user->ewallet_type}";
                Cache::put($key, $user, self::L2_TTL);
            }
        }
    }
}
```

## 📦 Deployment

### Deploy ke Production Server

#### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PHP 8.2 and extensions
sudo apt install -y php8.2-fpm php8.2-common php8.2-mysql \
  php8.2-pgsql php8.2-redis php8.2-bcmath php8.2-curl \
  php8.2-gd php8.2-intl php8.2-mbstring php8.2-xml \
  php8.2-zip php8.2-swoole

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Nginx
sudo apt install -y nginx

# Install Redis
sudo apt install -y redis-server

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Supervisor
sudo apt install -y supervisor
```

#### 2. Deploy Script

Buat file `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest changes
git pull origin main

# Install dependencies
composer install --no-interaction --optimize-autoloader --no-dev

# Clear old cache
php artisan optimize:clear

# Run migrations
php artisan migrate --force

# Cache configurations
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Restart queue workers
php artisan horizon:terminate
php artisan horizon

# Restart Octane (if using)
php artisan octane:reload

# Set permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

echo "✅ Deployment completed!"
```

#### 3. Zero-downtime Deployment dengan Envoyer

```bash
# Install Envoyer CLI
composer global require laravel/envoyer

# Deploy
envoyer deploy production
```

## 📊 Monitoring

### Laravel Telescope

Akses Telescope di: `https://api.ewallet.com/telescope`

```bash
# Protect Telescope route
php artisan telescope:auth --create
```

Metrics yang dimonitor:
- **Requests**: Semua request masuk
- **Exceptions**: Error yang terjadi
- **Logs**: Semua log entry
- **Queries**: Database query performance
- **Jobs**: Queue job status
- **Cache**: Cache hit/miss ratio

### Custom Health Check

```php
// routes/health.php
Route::get('/health', function () {
    return [
        'status' => 'healthy',
        'services' => [
            'database' => DB::connection()->getPdo() ? 'up' : 'down',
            'redis' => Cache::store('redis')->get('health_check') !== false ? 'up' : 'down',
            'queue' => Queue::size('default') !== false ? 'up' : 'down',
        ],
        'timestamp' => now(),
        'uptime' => system('uptime'),
    ];
});
```

### Alerting dengan Slack

```php
// App/Exceptions/Handler.php
public function report(Throwable $exception)
{
    if ($this->shouldReport($exception)) {
        Log::channel('slack')->critical($exception->getMessage(), [
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString()
        ]);
    }
    
    parent::report($exception);
}
```

## 💾 Backup & Recovery

### Automated Backup

```bash
# Install backup package
composer require spatie/laravel-backup

# Configure backup
php artisan vendor:publish --provider="Spatie\Backup\BackupServiceProvider"

# Run backup manually
php artisan backup:run

# Schedule backup
# app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    $schedule->command('backup:clean')->daily()->at('01:00');
    $schedule->command('backup:run')->daily()->at('02:00');
}
```

### Recovery Procedure

```bash
# Restore from backup
php artisan backup:restore

# Rollback migration
php artisan migrate:rollback --step=5

# Clear cache after recovery
php artisan optimize:clear
```

## 🔒 Security

### Security Headers

```php
// app/Http/Middleware/SecurityHeaders.php
public function handle($request, Closure $next)
{
    $response = $next($request);
    
    $response->headers->set('X-Frame-Options', 'DENY');
    $response->headers->set('X-Content-Type-Options', 'nosniff');
    $response->headers->set('X-XSS-Protection', '1; mode=block');
    $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
    $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    return $response;
}
```

### API Rate Limiting

```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        'throttle:api',
        \App\Http\Middleware\ApiKeyAuth::class,
        \App\Http\Middleware\SecurityHeaders::class,
    ],
];

// Route level
Route::middleware(['throttle:100,1'])->group(function () {
    Route::post('/check', [WalletController::class, 'check']);
});
```

## ⚡ Performance Optimization

### Caching Strategies

```php
// Cache expensive queries
$users = Cache::remember('active_users', 3600, function () {
    return WalletUser::where('status', 'active')->get();
});

// Cache with tags
Cache::tags(['users', 'active'])->remember('users_active', 3600, function () {
    return WalletUser::where('status', 'active')->get();
});

// Cache invalidation
Cache::tags(['users'])->flush();
```

### Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_phone_ewallet ON wallet_users(phone_number, ewallet_type);
CREATE INDEX idx_created_at ON wallet_users(created_at);

-- Partition large tables
CREATE TABLE wallet_users_2024 PARTITION OF wallet_users
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM wallet_users WHERE phone_number = '081234567890';
```

### Octane Configuration

```php
// config/octane.php
return [
    'server' => 'swoole',
    'workers' => 8,
    'max_requests' => 1000,
    'watch' => [
        'app',
        'bootstrap',
        'config',
        'database',
        'routes',
    ],
];
```

## 🧪 Testing

```bash
# Run all tests
php artisan test

# Run specific test
php artisan test --filter WalletCheckTest

# Run with coverage
php artisan test --coverage

# Run in parallel
php artisan test --parallel
```

## ❓ FAQ

**Q: Bagaimana cara meningkatkan performa untuk high traffic?**
A: Gunakan Laravel Octane dengan Swoole/RoadRunner, implementasikan read replica database, dan scale queue workers.

**Q: Error "Too many connections"**
A: Tingkatkan `max_connections` di PostgreSQL dan optimalkan connection pooling.

**Q: Queue job stuck**
A: Jalankan `php artisan horizon:terminate && php artisan horizon` atau check failed jobs di tabel `failed_jobs`.

**Q: Cache tidak update**
A: Flush cache dengan `php artisan cache:clear` dan pastikan cache tags digunakan dengan benar.

---
