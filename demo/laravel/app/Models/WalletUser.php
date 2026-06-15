<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletUser extends Model
{
    protected $table = 'wallet_users';
    
    protected $fillable = [
        'phone_number',
        'nickname',
        'ewallet_type'
    ];
    
    protected $hidden = [
        'created_at',
        'updated_at',
        'id'
    ];
    
    // Scope untuk pencarian
    public function scopeFindByPhoneAndWallet($query, $phoneNumber, $walletType)
    {
        return $query->where('phone_number', $phoneNumber)
                     ->where('ewallet_type', $walletType);
    }
}
