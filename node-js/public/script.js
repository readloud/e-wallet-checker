document.getElementById('checkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const identifier = document.getElementById('identifier').value;
    const walletType = document.getElementById('walletType').value;
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const resultDiv = document.getElementById('result');
    
    // Tampilkan loading
    btnText.classList.add('d-none');
    btnLoader.classList.remove('d-none');
    submitBtn.disabled = true;
    resultDiv.style.display = 'none';
    
    try {
        const response = await fetch('/api/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ identifier, walletType })
        });
        
        const data = await response.json();
        
        const alertDiv = resultDiv.querySelector('.alert');
        
        if (data.success) {
            alertDiv.className = 'alert alert-success';
            document.getElementById('resultTitle').textContent = '✅ Berhasil Ditemukan!';
            document.getElementById('resultMessage').innerHTML = `
                <strong>Nickname:</strong> ${data.data.nickname}<br>
                <strong>Nomor:</strong> ${data.data.phone}<br>
                <strong>E-Wallet:</strong> ${data.data.ewallet}
            `;
        } else {
            alertDiv.className = 'alert alert-danger';
            document.getElementById('resultTitle').textContent = '❌ Tidak Ditemukan';
            document.getElementById('resultMessage').innerHTML = data.message;
        }
        
        resultDiv.style.display = 'block';
        
    } catch (error) {
        const alertDiv = resultDiv.querySelector('.alert');
        alertDiv.className = 'alert alert-danger';
        document.getElementById('resultTitle').textContent = '⚠️ Error';
        document.getElementById('resultMessage').innerHTML = 'Terjadi kesalahan koneksi ke server';
        resultDiv.style.display = 'block';
    } finally {
        btnText.classList.remove('d-none');
        btnLoader.classList.add('d-none');
        submitBtn.disabled = false;
    }
});
