<?php

namespace Database\Factories;

use App\Models\Guardian;
use Illuminate\Database\Eloquent\Factories\Factory;

class GuardianFactory extends Factory
{
    protected $model = Guardian::class;

    public function definition(): array
    {
        return ['name' => fake()->name(), 'email' => fake()->unique()->safeEmail(), 'phone' => '+63 917 123 4567', 'address' => fake()->address()];
    }
}
