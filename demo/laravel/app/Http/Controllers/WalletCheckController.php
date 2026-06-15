<?php

namespace App\Http\Controllers;

use App\Services\WalletCheckService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class WalletCheckController extends Controller
{
    protected WalletCheckService $walletService;
    
    public function __construct(WalletCheckService $walletService)
    {
        $this->walletService = $walletService;
        $this->middleware('throttle:api');
        $this->middleware('api.key');
    }
    
    public function check(Request $request): JsonResponse
    {
        $startTime = microtime(true);
        
        try {
            $validated = $request->validate([
                'identifier' => 'required|string|regex:/^[0-9]{9,15}$/',
                'walletType' => 'required|in:ShopeePay,GoPay,DANA,OVO,iSaku'
            ]);
            
            // Use cache with lock
            $cacheKey = sprintf('user:%s:%s', $validated['identifier'], $validated['walletType']);
            
            $result = Cache::remember($cacheKey, 300, function () use ($validated) {
                return $this->walletService->checkNickname(
                    $validated['identifier'],
                    $validated['walletType']
                );
            });
            
            $executionTime = microtime(true) - $startTime;
            
            Log::channel('api')->info('API call processed', [
                'identifier' => $validated['identifier'],
                'wallet_type' => $validated['walletType'],
                'execution_time' => $executionTime,
                'cache_hit' => Cache::has($cacheKey),
                'ip' => $request->ip()
            ]);
            
            if ($result) {
                return response()->json([
                    'success' => true,
                    'data' => $result,
                    'meta' => [
                        'execution_time_ms' => round($executionTime * 1000, 2),
                        'timestamp' => now()->toIso8601String()
                    ]
                ]);
            }
            
            return response()->json([
                'success' => false,
                'message' => sprintf('Nickname tidak ditemukan untuk %s', $validated['walletType'])
            ], 404);
            
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Unexpected error in wallet check', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Internal server error'
            ], 500);
        }
    }
}
