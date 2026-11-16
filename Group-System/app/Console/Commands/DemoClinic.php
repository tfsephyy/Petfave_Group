<?php

namespace App\Console\Commands;

use App\Models\Animal;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\Guardian;
use App\Models\Species;
use App\Models\StockProduct;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DemoClinic extends Command
{
    protected $signature = 'petfave:demo';

    protected $description = 'Add sample clinic records to an empty local PetFave installation';

    public function handle(): int
    {
        if (! app()->isLocal() || Animal::exists() || Guardian::exists() || StockProduct::exists()) {
            $this->error('Demo records are only available for an empty local clinic.');

            return self::FAILURE;
        }
        $actor = User::where('role', 'admin')->first();
        if (! $actor) {
            $this->error('Create an administrator with petfave:staff first.');

            return self::FAILURE;
        }
        $this->call('db:seed', ['--force' => true]);
        DB::transaction(function () use ($actor) {
            $pets = [['Mochi', 'Shih Tzu', 'Dog', 'Isabella Santos', 'female', 4.2], ['Milo', 'Golden Retriever', 'Dog', 'Miguel Reyes', 'male', 26], ['Luna', 'Persian', 'Cat', 'Sofia Cruz', 'female', 3.8], ['Cooper', 'Beagle', 'Dog', 'Daniel Garcia', 'male', 11], ['Cleo', 'Puspin', 'Cat', 'Amelia Lim', 'female', 4.1], ['Pepper', 'Aspin', 'Dog', 'Lucas Ramos', 'male', 13.5]];
            $resources = BookingResource::orderBy('name')->get();
            foreach ($pets as $index => [$name, $breed, $species, $owner, $sex, $weight]) {
                $guardian = Guardian::create(['name' => $owner, 'email' => strtolower(explode(' ', $owner)[0]).'@example.test', 'phone' => '+63 917 555 '.str_pad((string) $index, 4, '0', STR_PAD_LEFT), 'address' => 'Quezon City, Metro Manila', 'notes' => 'Sample contact for local demonstration.']);
                $classification = Species::where('name', $species)->firstOrFail();
                $animal = Animal::create(['guardian_id' => $guardian->id, 'species_id' => $classification->id, 'breed_id' => $classification->breeds()->where('name', $breed)->value('id'), 'name' => $name, 'sex' => $sex, 'birth_date' => today()->subYears($index % 4 + 1)->toDateString(), 'weight_kg' => $weight, 'color' => ['Cream', 'Golden', 'White', 'Tricolor', 'Gray', 'Brown'][$index], 'notes' => 'Sample patient. A friendly companion who enjoys a gentle introduction.']);
                $animal->entries()->create(['kind' => 'vaccination', 'title' => $species === 'Dog' ? 'Anti-rabies vaccination' : 'Feline core vaccination', 'recorded_on' => today()->subMonths(11), 'due_on' => today()->addDays($index * 7 - 2), 'author_id' => $actor->id, 'notes' => 'Sample clinical record.']);
                $animal->encounters()->create(['seen_on' => today()->subDays(14 + $index), 'summary' => 'Routine wellness examination', 'diagnosis' => 'Sample record: no concerns noted at the routine examination.', 'plan' => 'Continue routine preventive care and follow the clinic’s instructions.', 'author_id' => $actor->id, 'weight_kg' => $weight]);
                $start = now('Asia/Manila')->addDays($index < 3 ? 1 : 2)->setTime(9 + $index, 0)->utc();
                Booking::create(['animal_id' => $animal->id, 'resource_id' => $resources[$index % $resources->count()]->id, 'created_by' => $actor->id, 'service' => ['Wellness exam', 'Vaccination', 'Consultation'][$index % 3], 'status' => $index % 2 ? 'pending' : 'confirmed', 'starts_at' => $start, 'ends_at' => $start->copy()->addMinutes(30)]);
                for ($month = 1; $month <= 5; $month++) {
                    if (($index + $month) % 3 === 0) {
                        continue;
                    }
                    $past = now('Asia/Manila')->startOfMonth()->subMonths($month)->addDays($index + 4)->setTime(10, 0)->utc();
                    Booking::create(['animal_id' => $animal->id, 'resource_id' => $resources[0]->id, 'created_by' => $actor->id, 'service' => 'Consultation', 'status' => 'completed', 'starts_at' => $past, 'ends_at' => $past->copy()->addMinutes(30), 'completed_at' => $past->copy()->addMinutes(30)]);
                }
            }
            foreach ([['Anti-rabies vaccine', 'Vaccines', 'vial', 24, 250], ['Examination gloves', 'Consumables', 'box', 4, 380], ['Deworming tablets', 'Medications', 'tablet', 48, 120], ['Sterile syringes', 'Consumables', 'piece', 5, 18], ['Pet recovery food', 'Nutrition', 'can', 16, 210]] as $index => [$name, $category, $unit, $quantity, $price]) {
                $product = StockProduct::create(['name' => $name, 'sku' => 'PF-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT), 'category' => $category, 'unit' => $unit, 'reorder_level' => 5, 'unit_price' => $price, 'expires_on' => today()->addMonths(9)->toDateString()]);
                app(StockService::class)->move($product, 'restock', $quantity, 'Opening sample stock', $actor);
            }
        });
        $this->info('Sample clinic records added. No owner logins or fixed passwords were created.');

        return self::SUCCESS;
    }
}
