<?php

namespace Database\Seeders;

use App\Models\BookingResource;
use App\Models\Breed;
use App\Models\Species;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $species = [
            'Dog' => ['Aspin', 'Beagle', 'Chihuahua', 'Golden Retriever', 'Labrador Retriever', 'Pomeranian', 'Poodle', 'Shih Tzu', 'Siberian Husky', 'Mixed breed'],
            'Cat' => ['Puspin', 'British Shorthair', 'Maine Coon', 'Persian', 'Ragdoll', 'Siamese', 'Mixed breed'],
            'Bird' => ['Budgerigar', 'Cockatiel', 'Lovebird', 'Parrot'],
            'Rabbit' => ['Holland Lop', 'Lionhead', 'Netherland Dwarf'],
            'Hamster' => ['Syrian', 'Dwarf'], 'Guinea Pig' => [], 'Reptile' => [], 'Turtle' => [], 'Fish' => [],
            'Horse' => [], 'Cow' => [], 'Sheep' => [], 'Goat' => [], 'Pig' => [], 'Chicken' => [], 'Duck' => [],
            'Turkey' => [], 'Ferret' => [], 'Chinchilla' => [], 'Other' => [],
        ];
        foreach ($species as $name => $breeds) {
            $species = Species::firstOrCreate(['name' => $name]);
            foreach ($breeds as $breed) {
                Breed::firstOrCreate(['species_id' => $species->id, 'name' => $breed]);
            }
        }
        BookingResource::firstOrCreate(['name' => 'Primary care team']);
        BookingResource::firstOrCreate(['name' => 'Wellness care team']);
    }
}
