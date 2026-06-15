package database

import (
    "database/sql"
    "log"
    
    _ "github.com/mattn/go-sqlite3"
)

type WalletUser struct {
    ID         int
    PhoneNumber string
    Nickname    string
    EwalletType string
}

var DB *sql.DB

func InitDB() {
    var err error
    DB, err = sql.Open("sqlite3", "./ewallet.db")
    if err != nil {
        log.Fatal(err)
    }
    
    createTableSQL := `
    CREATE TABLE IF NOT EXISTS wallet_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        nickname TEXT NOT NULL,
        ewallet_type TEXT NOT NULL
    );`
    
    _, err = DB.Exec(createTableSQL)
    if err != nil {
        log.Fatal(err)
    }
    
    // Insert dummy data
    insertDummyData()
}

func insertDummyData() {
    dummyData := []struct {
        PhoneNumber string
        Nickname    string
        EwalletType string
    }{
        {"081234567890", "Budi Santoso", "GoPay"},
        {"081298765432", "Siti Aisyah", "ShopeePay"},
        {"085678901234", "Agus Wijaya", "DANA"},
        {"087890123456", "Rina Fauziah", "OVO"},
        {"082345678901", "Dian Purnama", "iSaku"},
        {"081345678902", "Eko Prasetyo", "GoPay"},
        {"085678901235", "Lina Marlina", "ShopeePay"},
        {"081234567891", "Putri Wardani", "DANA"},
        {"087890123457", "Hendra Wijaya", "OVO"},
    }
    
    for _, data := range dummyData {
        stmt, _ := DB.Prepare("INSERT OR IGNORE INTO wallet_users (phone_number, nickname, ewallet_type) VALUES (?, ?, ?)")
        stmt.Exec(data.PhoneNumber, data.Nickname, data.EwalletType)
        stmt.Close()
    }
}

func CheckNickname(phoneNumber string, walletType string) (*WalletUser, error) {
    var user WalletUser
    
    query := `SELECT id, phone_number, nickname, ewallet_type 
              FROM wallet_users 
              WHERE phone_number = ? AND ewallet_type = ?`
    
    err := DB.QueryRow(query, phoneNumber, walletType).Scan(
        &user.ID, &user.PhoneNumber, &user.Nickname, &user.EwalletType,
    )
    
    if err != nil {
        return nil, err
    }
    
    return &user, nil
}

func GetSupportedWallets() []string {
    return []string{"ShopeePay", "GoPay", "DANA", "OVO", "iSaku"}
}
