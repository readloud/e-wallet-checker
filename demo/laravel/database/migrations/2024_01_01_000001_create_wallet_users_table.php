<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('wallet_users', function (Blueprint $table) {
            $table->id();
            $table->string('phone_number', 20)->unique();
            $table->string('nickname', 100);
            $table->enum('ewallet_type', ['ShopeePay', 'GoPay', 'DANA', 'OVO', 'iSaku']);
            $table->timestamps();
            
            // Composite index untuk pencarian cepat
            $table->index(['phone_number', 'ewallet_type']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('wallet_users');
    }
};
