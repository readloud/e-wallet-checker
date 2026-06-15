<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\WalletUser;

class WalletUserSeeder extends Seeder
{
    public function run()
    {
        $dummyData = [
            ['phone_number' => '081234567890', 'nickname' => 'Budi Santoso', 'ewallet_type' => 'GoPay'],
            ['phone_number' => '081298765432', 'nickname' => 'Siti Aisyah', 'ewallet_type' => 'ShopeePay'],
            ['phone_number' => '085678901234', 'nickname' => 'Agus Wijaya', 'ewallet_type' => 'DANA'],
            ['phone_number' => '087890123456', 'nickname' => 'Rina Fauziah', 'ewallet_type' => 'OVO'],
            ['phone_number' => '082345678901', 'nickname' => 'Dian Purnama', 'ewallet_type' => 'iSaku'],
            ['phone_number' => '081345678902', 'nickname' => 'Eko Prasetyo', 'ewallet_type' => 'GoPay'],
            ['phone_number' => '085678901235', 'nickname' => 'Lina Marlina', 'ewallet_type' => 'ShopeePay'],
            ['phone_number' => '081234567891', 'nickname' => 'Putri Wardani', 'ewallet_type' => 'DANA'],
            ['phone_number' => '087890123457', 'nickname' => 'Hendra Wijaya', 'ewallet_type' => 'OVO'],
        ];
        
        foreach ($dummyData as $data) {
            WalletUser::updateOrCreate(
                ['phone_number' => $data['phone_number'], 'ewallet_type' => $data['ewallet_type']],
                $data
            );
        }
    }
}
