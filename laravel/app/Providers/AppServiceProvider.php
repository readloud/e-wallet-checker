<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Rate limiting untuk API
        RateLimiter::for('api', function (Request $request) {
            $key = $request->ip();
            $limit = env('RATE_LIMITER_ATTEMPTS', 60);
            $decay = env('RATE_LIMITER_DECAY', 60);
            
            return Limit::perMinute($limit)->by($key);
        });
        
        // Query logging untuk production
        if (env('APP_ENV') === 'production') {
            DB::listen(function ($query) {
                if ($query->time > 100) { // Slow query > 100ms
                    Log::warning('Slow query detected', [
                        'sql' => $query->sql,
                        'bindings' => $query->bindings,
                        'time' => $query->time,
                        'connection' => $query->connectionName
                    ]);
                }
            });
        }
        
        // Cache configuration
        Cache::macro('rememberWithLock', function ($key, $ttl, $callback) {
            $lock = Cache::lock($key . '_lock', 10);
            try {
                if ($lock->get()) {
                    return Cache::remember($key, $ttl, $callback);
                }
            } finally {
                $lock->release();
            }
            return Cache::get($key);
        });
    }
}
