<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\WalletCheckService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class BatchCheckWallet implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public $timeout = 120;
    public $tries = 3;
    public $backoff = [5, 10, 30];
    
    protected array $identifiers;
    protected string $walletType;
    
    public function __construct(array $identifiers, string $walletType)
    {
        $this->identifiers = $identifiers;
        $this->walletType = $walletType;
    }
    
    public function handle(WalletCheckService $service): void
    {
        $results = [];
        
        foreach ($this->identifiers as $identifier) {
            try {
                $result = $service->checkNickname($identifier, $this->walletType);
                $results[$identifier] = $result;
            } catch (\Exception $e) {
                Log::error("Batch check failed for {$identifier}", [
                    'error' => $e->getMessage()
                ]);
                $results[$identifier] = null;
            }
        }
        
        // Store results in Redis with expiration
        $key = 'batch:' . uniqid();
        Redis::setex($key, 3600, json_encode($results));
        
        Log::info('Batch check completed', [
            'total' => count($this->identifiers),
            'successful' => count(array_filter($results)),
            'wallet_type' => $this->walletType
        ]);
    }
}
