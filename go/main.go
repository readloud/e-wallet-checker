package main

import (
    "ewallet-go/database"
    "ewallet-go/handlers"
    "ewallet-go/middleware"
    
    "github.com/gin-gonic/gin"
)

func main() {
    // Initialize database
    database.InitDB()
    
    router := gin.Default()
    
    // Middleware
    router.Use(middleware.CORSMiddleware())
    
    // Static files
    router.Static("/css", "./public/css")
    router.Static("/js", "./public/js")
    
    // API Routes
    api := router.Group("/api")
    {
        api.POST("/check", handlers.CheckNickname)
        api.GET("/supported-wallets", handlers.GetSupportedWallets)
    }
    
    // Web Routes
    router.GET("/", handlers.ServeWeb)
    
    // API Documentation
    router.GET("/api-docs", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "name":    "E-Wallet Nickname Checker API",
            "version": "1.0.0",
            "endpoints": gin.H{
                "POST /api/check": gin.H{
                    "description": "Cek nickname e-wallet",
                    "body": gin.H{
                        "identifier": "string (nomor HP)",
                        "walletType": "string (ShopeePay, GoPay, DANA, OVO, iSaku)",
                    },
                },
                "GET /api/supported-wallets": gin.H{
                    "description": "Daftar e-wallet yang didukung",
                },
            },
        })
    })
    
    router.Run(":3000")
}
