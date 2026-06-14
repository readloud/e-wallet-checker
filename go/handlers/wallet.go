package handlers

import (
    "net/http"
    "regexp"
    
    "ewallet-go/database"
    "ewallet-go/models"
    
    "github.com/gin-gonic/gin"
)

func CheckNickname(c *gin.Context) {
    var req models.CheckRequest
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, models.CheckResponse{
            Success: false,
            Message: "Parameter identifier dan walletType wajib diisi",
        })
        return
    }
    
    // Normalize phone number (remove non-digits)
    re := regexp.MustCompile(`[^0-9]`)
    normalizedPhone := re.ReplaceAllString(req.Identifier, "")
    
    user, err := database.CheckNickname(normalizedPhone, req.WalletType)
    
    if err != nil {
        c.JSON(http.StatusNotFound, models.CheckResponse{
            Success: false,
            Message: "Nickname tidak ditemukan untuk " + req.WalletType + " dengan identitas: " + req.Identifier,
        })
        return
    }
    
    c.JSON(http.StatusOK, models.CheckResponse{
        Success: true,
        Data: &models.UserData{
            Nickname: user.Nickname,
            Phone:    user.PhoneNumber,
            Ewallet:  user.EwalletType,
        },
    })
}

func GetSupportedWallets(c *gin.Context) {
    wallets := database.GetSupportedWallets()
    
    c.JSON(http.StatusOK, models.WalletsResponse{
        Success: true,
        Data:    wallets,
    })
}

func ServeWeb(c *gin.Context) {
    c.File("./public/index.html")
}
