package services

import (
    "context"
    "database/sql"
    "regexp"
    
    "ewallet-api/internal/models"
    
    "go.uber.org/zap"
)

type WalletService struct {
    db     *sql.DB
    logger *zap.Logger
}

func NewWalletService(db *sql.DB, logger *zap.Logger) *WalletService {
    return &WalletService{
        db:     db,
        logger: logger,
    }
}

func (s *WalletService) CheckNickname(ctx context.Context, identifier, walletType string) (*models.UserData, error) {
    // Normalize phone number
    re := regexp.MustCompile(`[^0-9]`)
    normalizedPhone := re.ReplaceAllString(identifier, "")
    
    // Prepare statement
    query := `
        SELECT nickname, phone_number, ewallet_type 
        FROM wallet_users 
        WHERE phone_number = $1 AND ewallet_type = $2
    `
    
    var user models.UserData
    err := s.db.QueryRowContext(ctx, query, normalizedPhone, walletType).Scan(
        &user.Nickname,
        &user.Phone,
        &user.Ewallet,
    )
    
    if err == sql.ErrNoRows {
        return nil, err
    }
    if err != nil {
        s.logger.Error("Database query failed", zap.Error(err))
        return nil, err
    }
    
    return &user, nil
}
