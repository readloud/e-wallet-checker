<?php

namespace App\Services;

use App\Models\WalletUser;

class WalletCheckService
{
    /**
     * Cek nickname berdasarkan nomor HP dan tipe e-wallet
     */
    public function checkNickname(string $identifier, string $walletType): ?array
    {
        // Normalisasi nomor HP (hapus spasi, strip, dll)
        $normalizedPhone = preg_replace('/[^0-9]/', '', $identifier);
        
        $user = WalletUser::findByPhoneAndWallet($normalizedPhone, $walletType)->first();
        
        if ($user) {
            return [
                'nickname' => $user->nickname,
                'phone' => $user->phone_number,
                'ewallet' => $user->ewallet_type
            ];
        }
        
        return null;
    }
    
    /**
     * Daftar e-wallet yang didukung
     */
    public function getSupportedWallets(): array
    {
        return ['ShopeePay', 'GoPay', 'DANA', 'OVO', 'iSaku'];
    }
}
