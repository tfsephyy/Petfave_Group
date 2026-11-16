<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockProduct extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'pf_stock_products';

    protected $fillable = ['sku', 'name', 'category', 'unit', 'description', 'reorder_level', 'unit_price', 'expires_on', 'archived_at'];

    protected function casts(): array
    {
        return ['expires_on' => 'date:Y-m-d', 'archived_at' => 'datetime', 'unit_price' => 'decimal:2'];
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'product_id');
    }
}
