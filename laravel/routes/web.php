<?php

use App\Http\Controllers\WalletCheckController;
use Illuminate\Support\Facades\Route;

Route::get('/', [WalletCheckController::class, 'index']);
