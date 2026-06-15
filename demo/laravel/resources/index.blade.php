<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Cek Nickname E-Wallet - Laravel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .card {
            border-radius: 15px;
            border: none;
        }
        .card-header {
            border-radius: 15px 15px 0 0 !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            transition: transform 0.2s;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
        }
        .alert {
            border-radius: 10px;
        }
        .result-card {
            animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card shadow">
                    <div class="card-header text-white">
                        <h3 class="text-center mb-0">🔍 Cek Nickname E-Wallet</h3>
                        <p class="text-center mb-0 small">Laravel Version</p>
                    </div>
                    <div class="card-body">
                        <form id="checkForm">
                            @csrf
                            <div class="mb-3">
                                <label for="identifier" class="form-label">Nomor HP / ID Akun</label>
                                <input type="text" class="form-control" id="identifier" 
                                       placeholder="Contoh: 081234567890" required>
                                <div class="form-text">Masukkan nomor HP tanpa spasi atau strip</div>
                            </div>
                            <div class="mb-3">
                                <label for="walletType" class="form-label">Pilih E-Wallet</label>
                                <select class="form-select" id="walletType" required>
                                    <option value="">Pilih...</option>
                                    <option value="GoPay">GoPay</option>
                                    <option value="ShopeePay">ShopeePay</option>
                                    <option value="DANA">DANA</option>
                                    <option value="OVO">OVO</option>
                                    <option value="iSaku">iSaku</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary w-100" id="submitBtn">
                                <span id="btnText">Cek Sekarang</span>
                                <span id="btnLoader" class="spinner-border spinner-border-sm d-none"></span>
                            </button>
                        </form>

                        <div id="result" class="mt-4" style="display: none;">
                            <div class="alert result-card" role="alert">
                                <h5 id="resultTitle"></h5>
                                <p id="resultMessage"></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-3">
                    <div class="card-body">
                        <h6 class="card-title">📖 Dokumentasi API</h6>
                        <p class="small mb-0">
                            <strong>POST /api/check</strong> - Cek nickname<br>
                            <strong>GET /api/supported-wallets</strong> - Daftar e-wallet
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        document.getElementById('checkForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const identifier = document.getElementById('identifier').value;
            const walletType = document.getElementById('walletType').value;
            const submitBtn = document.getElementById('submitBtn');
            const btnText = document.getElementById('btnText');
            const btnLoader = document.getElementById('btnLoader');
            const resultDiv = document.getElementById('result');
            
            if (!identifier || !walletType) {
                showResult('error', 'Peringatan', 'Harap isi semua field!');
                return;
            }
            
            // Tampilkan loading
            btnText.classList.add('d-none');
            btnLoader.classList.remove('d-none');
            submitBtn.disabled = true;
            resultDiv.style.display = 'none';
            
            try {
                const response = await fetch('/api/check', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({ identifier, walletType })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showResult('success', '✅ Berhasil Ditemukan!', 
                        `<strong>Nickname:</strong> ${data.data.nickname}<br>
                         <strong>Nomor:</strong> ${data.data.phone}<br>
                         <strong>E-Wallet:</strong> ${data.data.ewallet}`
                    );
                } else {
                    showResult('danger', '❌ Tidak Ditemukan', data.message);
                }
                
            } catch (error) {
                showResult('danger', '⚠️ Error', 'Terjadi kesalahan koneksi ke server');
            } finally {
                btnText.classList.remove('d-none');
                btnLoader.classList.add('d-none');
                submitBtn.disabled = false;
            }
        });
        
        function showResult(type, title, message) {
            const resultDiv = document.getElementById('result');
            const alertDiv = resultDiv.querySelector('.alert');
            const resultTitle = document.getElementById('resultTitle');
            const resultMessage = document.getElementById('resultMessage');
            
            alertDiv.className = `alert alert-${type} result-card`;
            resultTitle.textContent = title;
            resultMessage.innerHTML = message;
            resultDiv.style.display = 'block';
            
            // Auto scroll ke hasil
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    </script>
</body>
</html>
