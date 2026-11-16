<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\StockMovement;
use App\Models\StockProduct;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class BookingConcurrencyTest extends TestCase
{
    public function test_concurrent_booking_and_stock_requests_cannot_double_reserve_or_overdraw(): void
    {
        $database = tempnam(sys_get_temp_dir(), 'petfave-race-');
        $files = [$database];
        $previous = config('database.default');
        config(['database.connections.race' => array_replace(config('database.connections.sqlite'), ['database' => $database]), 'database.default' => 'race']);
        try {
            $this->artisan('migrate', ['--database' => 'race', '--force' => true])->assertSuccessful();
            $admin = User::factory()->create(['role' => 'admin']);
            $pet = Animal::factory()->create();
            $resource = BookingResource::create(['name' => 'Concurrent care team']);
            $booking = ['kind' => 'booking', 'actor_id' => $admin->id, 'data' => [
                'animal_id' => $pet->id, 'resource_id' => $resource->id, 'service' => 'Consultation',
                'starts_at' => now()->addDay()->toIso8601String(), 'ends_at' => now()->addDay()->addMinutes(30)->toIso8601String(),
            ]];
            $this->assertSame([201, 422], $this->race($database, $booking, $files));
            $this->assertSame(1, Booking::count());
            $product = StockProduct::factory()->create();
            app(StockService::class)->move($product, 'restock', 5, 'Opening stock', $admin);
            $this->assertSame([201, 422], $this->race($database, ['kind' => 'stock', 'actor_id' => $admin->id, 'product_id' => $product->id], $files));
            $this->assertSame(1, $product->fresh()->quantity);
            $this->assertSame(2, StockMovement::count());
        } finally {
            DB::purge('race');
            config(['database.default' => $previous]);
            foreach ($files as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }
            foreach (['-wal', '-shm', '-journal'] as $suffix) {
                if (is_file($database.$suffix)) {
                    unlink($database.$suffix);
                }
            }
        }
    }

    public function test_mysql_concurrent_requests_cannot_double_reserve_or_overdraw(): void
    {
        if (getenv('PETFAVE_TEST_MYSQL') !== '1') {
            $this->markTestSkipped('Set PETFAVE_TEST_MYSQL=1 to run against a temporary, isolated MySQL database.');
        }
        $database = 'petfave_test_'.bin2hex(random_bytes(6));
        $previous = config('database.default');
        $server = DB::build(array_replace(config('database.connections.mysql'), ['database' => null, 'url' => null]));
        $server->statement('CREATE DATABASE `'.$database.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $files = [];
        config(['database.connections.race' => array_replace(config('database.connections.mysql'), ['database' => $database, 'url' => null]), 'database.default' => 'race']);
        try {
            $this->artisan('migrate', ['--database' => 'race', '--force' => true])->assertSuccessful();
            $admin = User::factory()->create(['role' => 'admin']);
            $pet = Animal::factory()->create();
            $resource = BookingResource::create(['name' => 'Concurrent MySQL care team']);
            $booking = ['kind' => 'booking', 'actor_id' => $admin->id, 'data' => [
                'animal_id' => $pet->id, 'resource_id' => $resource->id, 'service' => 'Consultation',
                'starts_at' => now()->addDay()->toIso8601String(), 'ends_at' => now()->addDay()->addMinutes(30)->toIso8601String(),
            ]];
            $this->assertSame([201, 422], $this->race($database, $booking, $files, 'mysql'));
            $this->assertSame(1, Booking::count());
            $product = StockProduct::factory()->create();
            app(StockService::class)->move($product, 'restock', 5, 'Opening stock', $admin);
            $this->assertSame([201, 422], $this->race($database, ['kind' => 'stock', 'actor_id' => $admin->id, 'product_id' => $product->id], $files, 'mysql'));
            $this->assertSame(1, $product->fresh()->quantity);
            $this->assertSame(2, StockMovement::count());
        } finally {
            DB::purge('race');
            config(['database.default' => $previous]);
            $server->statement('DROP DATABASE `'.$database.'`');
            $server->disconnect();
            foreach ($files as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }
        }
    }

    private function race(string $database, array $payload, array &$files, string $driver = 'sqlite'): array
    {
        $input = tempnam(sys_get_temp_dir(), 'petfave-input-');
        $go = $input.'-go';
        file_put_contents($input, json_encode($payload, JSON_THROW_ON_ERROR));
        $files[] = $input;
        $files[] = $go;
        $processes = [];
        $readyFiles = [];
        for ($index = 0; $index < 2; $index++) {
            $ready = $input.'-ready-'.$index;
            $files[] = $ready;
            $readyFiles[] = $ready;
            $process = new Process([PHP_BINARY, base_path('tests/Support/race-worker.php'), $database, $input, $ready, $go, $driver], base_path(), ['APP_ENV' => 'testing', 'APP_DEBUG' => 'false']);
            $process->setTimeout(30);
            $process->start();
            $processes[] = $process;
        }
        $deadline = microtime(true) + 15;
        while ((! is_file($readyFiles[0]) || ! is_file($readyFiles[1])) && microtime(true) < $deadline) {
            usleep(10000);
        }
        touch($go);
        $statuses = [];
        foreach ($processes as $process) {
            $process->wait();
            $this->assertSame(0, $process->getExitCode(), $process->getErrorOutput().$process->getOutput());
            $statuses[] = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR)['status'];
        }
        sort($statuses);

        return $statuses;
    }
}
