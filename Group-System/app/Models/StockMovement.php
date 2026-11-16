<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'pf_stock_movements';

    protected $fillable = ['product_id', 'actor_id', 'encounter_id', 'type', 'delta', 'balance', 'reason'];

    protected function casts(): array
    {
        return [];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id')->select('id', 'name');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(StockProduct::class, 'product_id');
    }
}
