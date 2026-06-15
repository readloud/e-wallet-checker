<?php

use App\Http\Controllers\WalletCheckController;
use Illuminate\Support\Facades\Route;

Route::post('/check', [WalletCheckController::class, 'check']);
Route::get('/supported-wallets', [WalletCheckController::class, 'getSupportedWallets']);
