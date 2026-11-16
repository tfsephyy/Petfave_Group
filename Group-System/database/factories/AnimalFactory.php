<?php

namespace Database\Factories;

use App\Models\Animal;
use App\Models\Guardian;
use App\Models\Species;
use Illuminate\Database\Eloquent\Factories\Factory;

class AnimalFactory extends Factory
{
    protected $model = Animal::class;

    public function definition(): array
    {
        return ['guardian_id' => Guardian::factory(), 'species_id' => Species::firstOrCreate(['name' => 'Dog'])->id, 'name' => fake()->firstName(), 'sex' => 'female', 'birth_date' => '2023-02-14', 'weight_kg' => 4.5];
    }
}
