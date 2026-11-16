<?php

namespace Database\Factories;

use App\Models\Animal;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingFactory extends Factory
{
    protected $model = Booking::class;

    public function definition(): array
    {
        return ['animal_id' => Animal::factory(), 'resource_id' => BookingResource::firstOrCreate(['name' => 'Care team'])->id, 'created_by' => User::factory(), 'service' => 'Consultation', 'status' => 'pending', 'starts_at' => now()->addDays(2)->startOfHour(), 'ends_at' => now()->addDays(2)->startOfHour()->addMinutes(30)];
    }
}
