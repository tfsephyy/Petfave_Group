<?php

namespace Database\Factories;

use App\Models\StockProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockProductFactory extends Factory
{
    protected $model = StockProduct::class;

    public function definition(): array
    {
        return ['name' => 'Clinic supplies', 'sku' => fake()->unique()->bothify('PF-####??'), 'category' => 'Consumables', 'unit' => 'unit', 'unit_price' => 100, 'reorder_level' => 5];
    }
}
