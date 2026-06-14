// config/octane.php
return [
    'server' => 'swoole',
    'workers' => 8,
    'max_requests' => 1000,
    'watch' => [
        'app',
        'bootstrap',
        'config',
        'database',
        'routes',
    ],
];
