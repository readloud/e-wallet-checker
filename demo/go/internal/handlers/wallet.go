package handlers

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
    
    "ewallet-api/internal/models"
    "ewallet-api/internal/services"
    
    "github.com/gin-gonic/gin"
    "github.com/go-playground/validator/v10"
    "github.com/redis/go-redis/v9"
    "go.uber.org/zap"
)

type WalletHandler struct {
    service    *services.WalletService
    redis      *redis.Client
    logger     *zap.Logger
    validator  *validator.Validate
}

func NewWalletHandler(db *sql.DB, redis *redis.Client, logger *zap.Logger) *WalletHandler {
    return &WalletHandler{
        service:   services.NewWalletService(db, logger),
        redis:     redis,
        logger:    logger,
        validator: validator.New(),
    }
}

func (h *WalletHandler) CheckNickname(c *gin.Context) {
    startTime := time.Now()
    
    var req models.CheckRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, models.ErrorResponse{
            Success: false,
            Message: "Invalid request body",
        })
        return
    }
    
    // Validate request
    if err := h.validator.Struct(req); err != nil {
        c.JSON(http.StatusBadRequest, models.ErrorResponse{
            Success: false,
            Message: err.Error(),
        })
        return
    }
    
    // Check cache
    cacheKey := fmt.Sprintf("user:%s:%s", req.Identifier, req.WalletType)
    cached, err := h.redis.Get(c.Request.Context(), cacheKey).Result()
    
    if err == nil {
        var result models.UserData
        if err := json.Unmarshal([]byte(cached), &result); err == nil {
            h.logger.Info("Cache hit",
                zap.String("identifier", req.Identifier),
                zap.String("wallet_type", req.WalletType),
            )
            c.JSON(http.StatusOK, models.SuccessResponse{
                Success: true,
                Data:    result,
                Meta: models.Meta{
                    ExecutionTimeMs: time.Since(startTime).Milliseconds(),
                    CacheHit:        true,
                },
            })
            return
        }
    }
    
    // Query database
    user, err := h.service.CheckNickname(c.Request.Context(), req.Identifier, req.WalletType)
    if err != nil {
        h.logger.Error("Failed to check nickname",
            zap.Error(err),
            zap.String("identifier", req.Identifier),
        )
        c.JSON(http.StatusNotFound, models.ErrorResponse{
            Success: false,
            Message: fmt.Sprintf("Nickname tidak ditemukan untuk %s", req.WalletType),
        })
        return
    }
    
    // Cache result
    userJSON, _ := json.Marshal(user)
    h.redis.Set(c.Request.Context(), cacheKey, userJSON, 5*time.Minute)
    
    c.JSON(http.StatusOK, models.SuccessResponse{
        Success: true,
        Data:    user,
        Meta: models.Meta{
            ExecutionTimeMs: time.Since(startTime).Milliseconds(),
            CacheHit:        false,
        },
    })
}

func (h *WalletHandler) BatchCheck(c *gin.Context) {
    var req models.BatchCheckRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, models.ErrorResponse{
            Success: false,
            Message: "Invalid request body",
        })
        return
    }
    
    // Use goroutines for parallel processing
    results := make(map[string]*models.UserData)
    resultChan := make(chan models.BatchResult, len(req.Identifiers))
    
    for _, identifier := range req.Identifiers {
        go func(id string) {
            user, err := h.service.CheckNickname(context.Background(), id, req.WalletType)
            resultChan <- models.BatchResult{
                Identifier: id,
                Data:       user,
                Error:      err,
            }
        }(identifier)
    }
    
    for i := 0; i < len(req.Identifiers); i++ {
        res := <-resultChan
        if res.Error == nil {
            results[res.Identifier] = res.Data
        }
    }
    
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    results,
        "total":   len(results),
    })
}
