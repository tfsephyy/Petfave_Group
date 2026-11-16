<?php

use App\Models\StockProduct;
use App\Models\User;
use App\Services\BookingService;
use App\Services\StockService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$driver = $argv[5] ?? 'sqlite';
config(['database.default' => $driver, 'database.connections.'.$driver.'.database' => $argv[1], 'database.connections.sqlite.busy_timeout' => 10000]);
DB::purge($driver);
$payload = json_decode(file_get_contents($argv[2]), true, flags: JSON_THROW_ON_ERROR);
$actor = User::findOrFail($payload['actor_id']);
Auth::setUser($actor);
file_put_contents($argv[3], 'ready');
$deadline = microtime(true) + 15;
while (! is_file($argv[4]) && microtime(true) < $deadline) {
    usleep(10000);
}
try {
    if ($payload['kind'] === 'booking') {
        app(BookingService::class)->save($payload['data'], $actor);
    } else {
        app(StockService::class)->move(StockProduct::findOrFail($payload['product_id']), 'issue', 4, 'Concurrent stock issue', $actor);
    }
    echo json_encode(['status' => 201]);
} catch (ValidationException $exception) {
    echo json_encode(['status' => 422]);
} catch (Throwable $exception) {
    fwrite(STDERR, $exception::class.': '.$exception->getMessage());
    exit(1);
}
