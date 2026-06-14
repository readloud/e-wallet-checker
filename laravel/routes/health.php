// routes/health.php
Route::get('/health', function () {
    return [
        'status' => 'healthy',
        'services' => [
            'database' => DB::connection()->getPdo() ? 'up' : 'down',
            'redis' => Cache::store('redis')->get('health_check') !== false ? 'up' : 'down',
            'queue' => Queue::size('default') !== false ? 'up' : 'down',
        ],
        'timestamp' => now(),
        'uptime' => system('uptime'),
    ];
});
