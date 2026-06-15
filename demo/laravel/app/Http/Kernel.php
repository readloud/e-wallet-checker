// app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        'throttle:api',
        \App\Http\Middleware\ApiKeyAuth::class,
        \App\Http\Middleware\SecurityHeaders::class,
    ],
];

// Route level
Route::middleware(['throttle:100,1'])->group(function () {
    Route::post('/check', [WalletController::class, 'check']);
});
