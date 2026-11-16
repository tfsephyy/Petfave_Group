<?php

namespace App\Services;

use App\Models\StockMovement;
use App\Models\StockProduct;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockService
{
    public function move(StockProduct $product, string $type, int $quantity, string $reason, User $actor, ?string $encounterId = null): StockMovement
    {
        if (! in_array($type, ['restock', 'issue'], true) || $quantity < 1 || $quantity > 1000000) {
            throw ValidationException::withMessages(['quantity' => 'Choose a valid movement type and a quantity between 1 and 1,000,000.']);
        }

        return DB::transaction(function () use ($product, $type, $quantity, $reason, $actor, $encounterId) {
            if (DB::connection()->getDriverName() === 'sqlite') {
                StockProduct::whereKey($product->id)->increment('quantity', 0);
            }
            $product = StockProduct::lockForUpdate()->findOrFail($product->id);
            if ($product->archived_at) {
                throw ValidationException::withMessages(['product_id' => 'Restore this product before changing stock.']);
            }
            if ($type === 'issue' && $product->expires_on !== null && $product->expires_on->toDateString() < now('Asia/Manila')->toDateString()) {
                throw ValidationException::withMessages(['product_id' => 'Expired products cannot be issued.']);
            }
            $delta = $type === 'restock' ? $quantity : -$quantity;
            $query = StockProduct::whereKey($product->id);
            if ($delta < 0) {
                $query->where('quantity', '>=', $quantity);
            } else {
                $query->where('quantity', '<=', 1000000000 - $quantity);
            }
            $updated = $query->increment('quantity', $delta);
            if (! $updated) {
                throw ValidationException::withMessages(['quantity' => 'Insufficient stock, or the stock limit would be exceeded.']);
            }
            $product->refresh();
            $movement = StockMovement::create([
                'product_id' => $product->id, 'actor_id' => $actor->id, 'encounter_id' => $encounterId,
                'type' => $type, 'delta' => $delta, 'balance' => $product->quantity, 'reason' => $reason,
            ]);
            Audit::record('inventory.'.$type, $product, ['delta' => $delta, 'balance' => $product->quantity, 'reason' => $reason]);

            return $movement;
        }, 3);
    }
}
