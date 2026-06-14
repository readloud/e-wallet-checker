package models

type CheckRequest struct {
    Identifier string `json:"identifier" binding:"required"`
    WalletType string `json:"walletType" binding:"required"`
}

type CheckResponse struct {
    Success bool        `json:"success"`
    Data    *UserData   `json:"data,omitempty"`
    Message string      `json:"message,omitempty"`
}

type UserData struct {
    Nickname string `json:"nickname"`
    Phone    string `json:"phone"`
    Ewallet  string `json:"ewallet"`
}

type WalletsResponse struct {
    Success bool     `json:"success"`
    Data    []string `json:"data"`
}
