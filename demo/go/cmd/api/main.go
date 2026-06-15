package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
    
    "ewallet-api/internal/config"
    "ewallet-api/internal/database"
    "ewallet-api/internal/handlers"
    "ewallet-api/internal/middleware"
    "ewallet-api/pkg/logger"
    
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

func main() {
    // Load configuration
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }
    
    // Initialize logger
    zapLogger, err := logger.NewLogger(cfg.Log)
    if err != nil {
        log.Fatalf("Failed to initialize logger: %v", err)
    }
    defer zapLogger.Sync()
    
    // Initialize database
    db, err := database.NewPostgresDB(cfg.Database, zapLogger)
    if err != nil {
        zapLogger.Fatal("Failed to connect to database", zap.Error(err))
    }
    defer db.Close()
    
    // Run migrations
    if err := database.RunMigrations(db); err != nil {
        zapLogger.Fatal("Failed to run migrations", zap.Error(err))
    }
    
    // Initialize Redis
    redisClient, err := database.NewRedisClient(cfg.Redis, zapLogger)
    if err != nil {
        zapLogger.Fatal("Failed to connect to Redis", zap.Error(err))
    }
    defer redisClient.Close()
    
    // Set Gin mode
    gin.SetMode(gin.ReleaseMode)
    
    // Create router
    router := gin.New()
    
    // Middleware
    router.Use(middleware.Recovery(zapLogger))
    router.Use(middleware.Logger(zapLogger))
    router.Use(middleware.CORS(cfg.Security))
    router.Use(middleware.RateLimiter(cfg.RateLimit, redisClient))
    router.Use(middleware.APIKeyAuth(cfg.Security.APIKey))
    
    // Health check endpoint
    router.GET("/health", handlers.HealthCheck(db, redisClient))
    
    // Metrics endpoint for Prometheus
    router.GET("/metrics", gin.WrapH(middleware.PrometheusHandler()))
    
    // API routes
    api := router.Group("/api/v1")
    {
        walletHandler := handlers.NewWalletHandler(db, redisClient, zapLogger)
        api.POST("/check", walletHandler.CheckNickname)
        api.GET("/supported-wallets", walletHandler.GetSupportedWallets)
        api.POST("/batch-check", walletHandler.BatchCheck)
    }
    
    // HTTP Server
    srv := &http.Server{
        Addr:           cfg.Server.Port,
        Handler:        router,
        ReadTimeout:    cfg.Server.ReadTimeout,
        WriteTimeout:   cfg.Server.WriteTimeout,
        IdleTimeout:    cfg.Server.IdleTimeout,
        MaxHeaderBytes: cfg.Server.MaxHeaderBytes,
    }
    
    // Start server in goroutine
    go func() {
        zapLogger.Info("Starting server", zap.String("port", cfg.Server.Port))
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            zapLogger.Fatal("Failed to start server", zap.Error(err))
        }
    }()
    
    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    
    zapLogger.Info("Shutting down server...")
    
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    if err := srv.Shutdown(ctx); err != nil {
        zapLogger.Fatal("Server forced to shutdown", zap.Error(err))
    }
    
    zapLogger.Info("Server exited gracefully")
}
