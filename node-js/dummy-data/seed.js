const db = require('../database.js');

const dummyUsers = [
  { phone_number: '081234567890', nickname: 'Budi Santoso', ewallet_type: 'GoPay' },
  { phone_number: '081298765432', nickname: 'Siti Aisyah', ewallet_type: 'ShopeePay' },
  { phone_number: '085678901234', nickname: 'Agus Wijaya', ewallet_type: 'DANA' },
  { phone_number: '087890123456', nickname: 'Rina Fauziah', ewallet_type: 'OVO' },
  { phone_number: '082345678901', nickname: 'Dian Purnama', ewallet_type: 'iSaku' },
  { phone_number: '081345678902', nickname: 'Eko Prasetyo', ewallet_type: 'GoPay' },
  { phone_number: '085678901235', nickname: 'Lina Marlina', ewallet_type: 'ShopeePay' }
];

db.serialize(() => {
  const stmt = db.prepare('INSERT OR REPLACE INTO users (phone_number, nickname, ewallet_type) VALUES (?, ?, ?)');
  
  dummyUsers.forEach(user => {
    stmt.run(user.phone_number, user.nickname, user.ewallet_type);
  });
  
  stmt.finalize();
  
  console.log('✅ Data dummy berhasil ditambahkan ke database');
  
  db.close();
});
