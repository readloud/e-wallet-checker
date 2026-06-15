# DEMO e-wallet-checker

- [GoLang](go/#README.md)
- [Laravel](laravel/#README.md)
- [Node.Js](node-js/#README.md)
  
## 🚀 Quick Start Production

## Node.js
```bash
# Build and run with Docker
docker-compose -f docker-compose.yml up -d

# Or with PM2
npm run pm2:start

# Scale horizontally
pm2 scale ewallet-api 4
```

## Laravel
```bash
# Deploy with Forge or manually
php artisan optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Start queue worker
php artisan horizon

# With supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-worker:*
```

## Go
```bash
# Build binary for production
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o app cmd/api/main.go

# Run with systemd or Kubernetes
make docker-build
make deploy-prod
```

Ketiga versi di atas sudah siap untuk **production grade** dengan mempertimbangkan:
- High availability
- Scalability (horizontal & vertical)
- Security (authentication, rate limiting, CORS)
- Monitoring & logging
- Caching strategy
- Graceful shutdown
- Containerization
- Orchestration (Kubernetes)
