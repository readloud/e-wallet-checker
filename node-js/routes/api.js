const express = require('express');
const router = express.Router();
const db = require('../database.js');

// Endpoint untuk cek nickname berdasarkan nomor HP atau ID
router.post('/check', (req, res) => {
  const { identifier, walletType } = req.body;

  if (!identifier || !walletType) {
    return res.status(400).json({
      success: false,
      message: 'Parameter identifier dan walletType wajib diisi'
    });
  }

  // Normalisasi nomor HP (opsional)
  let normalizedIdentifier = identifier.replace(/\s/g, '');
  
  // Query ke database dummy
  db.get(
    'SELECT nickname, phone_number, ewallet_type FROM users WHERE phone_number = ? AND ewallet_type = ?',
    [normalizedIdentifier, walletType],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: 'Terjadi kesalahan pada server'
        });
      }

      if (row) {
        return res.json({
          success: true,
          data: {
            nickname: row.nickname,
            phone: row.phone_number,
            ewallet: row.ewallet_type
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: `Nickname tidak ditemukan untuk ${walletType} dengan identitas: ${normalizedIdentifier}`
        });
      }
    }
  );
});

// Endpoint untuk mendapatkan daftar e-wallet yang didukung
router.get('/supported-wallets', (req, res) => {
  res.json({
    success: true,
    data: ['ShopeePay', 'GoPay', 'DANA', 'OVO', 'iSaku']
  });
});

module.exports = router;
