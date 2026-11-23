<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\Breed;
use App\Models\Guardian;
use App\Models\Species;
use App\Models\StockProduct;
use App\Models\User;
use App\Services\StockService;
use Carbon\Carbon;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ClinicWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): User
    {
        $owner = User::factory()->create(['password' => 'SecurePassword123!']);
        Guardian::factory()->create(['account_id' => $owner->id, 'name' => $owner->name, 'email' => $owner->email]);

        return $owner;
    }

    private function staff(string $role = 'admin'): User
    {
        return User::factory()->create(['role' => $role]);
    }

    private function pet(User $owner): Animal
    {
        return Animal::factory()->create(['guardian_id' => $owner->guardian->id]);
    }

    private function bookingData(Animal $pet): array
    {
        $start = now('Asia/Manila')->addDays(2)->setTime(10, 0);
        if ($start->isSunday()) {
            $start->addDay();
        }

        return [
            'animal_id' => $pet->id,
            'resource_id' => BookingResource::firstOrCreate(['name' => 'Primary team'])->id,
            'service' => 'Consultation',
            'starts_at' => $start->toIso8601String(),
            'ends_at' => $start->copy()->addMinutes(15)->toIso8601String(),
        ];
    }

    public function test_registration_creates_only_one_owner_account_and_guardian(): void
    {
        $this->postJson('/api/register', ['name' => 'Ana Santos', 'email' => 'ana@example.test', 'password' => 'SecurePassword123!', 'password_confirmation' => 'SecurePassword123!'])
            ->assertCreated()->assertJsonPath('user.role', 'owner')->assertJsonStructure(['csrf_token']);
        $this->assertDatabaseCount('pf_accounts', 1);
        $this->assertDatabaseCount('pf_guardians', 1);
        $this->assertAuthenticated();
        $this->assertDatabaseMissing('pf_accounts', ['password' => 'SecurePassword123!']);
    }

    public function test_registration_rejects_role_injection_and_weak_passwords(): void
    {
        $this->postJson('/api/register', ['name' => 'Attacker', 'email' => 'bad@example.test', 'password' => 'password', 'password_confirmation' => 'different', 'role' => 'admin'])
            ->assertUnprocessable()->assertJsonValidationErrors(['role', 'password']);
        $this->assertDatabaseCount('pf_accounts', 0);
    }

    public function test_guests_and_owners_cannot_access_staff_modules(): void
    {
        $this->getJson('/api/animals')->assertUnauthorized();
        $this->actingAs($this->owner());
        foreach (['guardians', 'inventory', 'stock-movements', 'audit'] as $module) {
            $this->getJson('/api/'.$module)->assertForbidden();
        }
    }

    public function test_owner_lists_and_metrics_are_scoped_and_direct_access_is_denied(): void
    {
        $first = $this->owner();
        $second = $this->owner();
        $ownPet = $this->pet($first);
        $otherPet = $this->pet($second);
        $this->actingAs($first)->getJson('/api/animals')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $ownPet->id)->assertJsonMissing(['id' => $otherPet->id]);
        $this->getJson('/api/animals/'.$otherPet->id)->assertForbidden();
        $this->getJson('/api/animals/'.$otherPet->id.'/photo')->assertForbidden();
        $this->getJson('/api/animals/'.$otherPet->id.'/media/anything/file')->assertForbidden();
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('stats.animals', 1);
        $this->getJson('/api/options')->assertOk()->assertJsonMissing(['id' => $otherPet->id]);
    }

    public function test_owners_cannot_transfer_ownership_or_archive_pets(): void
    {
        $owner = $this->owner();
        $pet = $this->pet($owner);
        $other = $this->owner();
        $this->actingAs($owner)->putJson('/api/animals/'.$pet->id, [
            'name' => 'Changed', 'species_id' => $pet->species_id, 'sex' => 'male', 'guardian_id' => $other->guardian->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('guardian_id');
        $this->patchJson('/api/animals/'.$pet->id.'/archive', ['archived' => true])->assertForbidden();
        $this->assertSame($owner->guardian->id, $pet->fresh()->guardian_id);
    }

    public function test_pet_registration_derives_owner_and_validates_breed_species(): void
    {
        $owner = $this->owner();
        $dog = Species::create(['name' => 'Dog']);
        $cat = Species::create(['name' => 'Cat']);
        $breed = Breed::create(['name' => 'Persian', 'species_id' => $cat->id]);
        $this->actingAs($owner)->postJson('/api/animals', ['name' => 'Milo', 'species_id' => $dog->id, 'breed_id' => $breed->id, 'sex' => 'male'])
            ->assertUnprocessable()->assertJsonValidationErrors('breed_id');
        $this->postJson('/api/animals', ['name' => 'Milo', 'species_id' => $dog->id, 'sex' => 'male'])
            ->assertCreated()->assertJsonPath('guardian_id', $owner->guardian->id)->assertJsonPath('photo_url', null);
    }

    public function test_custom_species_and_breeds_are_normalized_and_reused(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner);
        $payload = ['name' => 'Sonic', 'custom_species' => 'hedgehog', 'custom_breed' => 'african pygmy', 'sex' => 'unknown'];
        $first = $this->postJson('/api/animals', $payload)->assertCreated()->json();
        $second = $this->postJson('/api/animals', array_replace($payload, ['name' => 'Spike']))->assertCreated()->json();
        $this->assertSame($first['species_id'], $second['species_id']);
        $this->assertSame($first['breed_id'], $second['breed_id']);
        $this->assertDatabaseHas('pf_species', ['name' => 'Hedgehog']);
        $this->assertDatabaseHas('pf_breeds', ['name' => 'African Pygmy', 'species_id' => $first['species_id']]);
        $this->postJson('/api/animals', $payload + ['species_id' => $first['species_id']])->assertUnprocessable();
    }

    public function test_clinical_writes_require_a_clinician_and_child_ids_are_parent_scoped(): void
    {
        $owner = $this->owner();
        $pet = $this->pet($owner);
        $other = $this->pet($owner);
        $payload = ['kind' => 'vaccination', 'title' => 'Anti-rabies', 'recorded_on' => today()->toDateString()];
        $this->actingAs($owner)->postJson('/api/animals/'.$pet->id.'/entries', $payload)->assertForbidden();
        $this->actingAs($this->staff('receptionist'))->postJson('/api/animals/'.$pet->id.'/entries', $payload)->assertForbidden();
        $vet = $this->staff('veterinarian');
        $entry = $this->actingAs($vet)->postJson('/api/animals/'.$pet->id.'/entries', $payload)->assertCreated()->json('id');
        $this->putJson('/api/animals/'.$other->id.'/entries/'.$entry, $payload + ['correction_reason' => 'Wrong date entered'])
            ->assertNotFound();
        $this->putJson('/api/animals/'.$pet->id.'/entries/'.$entry, $payload + ['author_id' => $owner->id, 'correction_reason' => 'Wrong date entered'])
            ->assertUnprocessable();
        $this->putJson('/api/animals/'.$pet->id.'/entries/'.$entry, array_replace($payload, ['title' => 'Corrected vaccine', 'correction_reason' => 'Corrected the vaccine name']))
            ->assertOk()->assertJsonPath('author_id', $vet->id);
        $this->assertDatabaseHas('pf_audit_events', ['action' => 'clinical.corrected', 'subject_id' => $entry]);
        $this->patchJson('/api/animals/'.$pet->id.'/entries/'.$entry.'/void', ['reason' => 'Duplicate clinical record'])
            ->assertOk()->assertJsonPath('void_reason', 'Duplicate clinical record');
        $this->assertDatabaseHas('pf_clinical_entries', ['id' => $entry]);
    }

    public function test_private_uploads_are_owner_checked_and_removed_from_storage(): void
    {
        Storage::fake('local');
        $owner = $this->owner();
        $pet = $this->pet($owner);
        $this->actingAs($owner);
        $first = $this->post('/api/animals/'.$pet->id.'/photo', ['photo' => UploadedFile::fake()->image('milo.jpg')], ['Accept' => 'application/json'])->assertOk();
        $oldPath = $pet->fresh()->photo_path;
        $this->post('/api/animals/'.$pet->id.'/photo', ['photo' => UploadedFile::fake()->image('milo-new.png')], ['Accept' => 'application/json'])->assertOk();
        Storage::disk('local')->assertMissing($oldPath);
        $this->get('/api/animals/'.$pet->id.'/photo')->assertOk();
        $media = $this->post('/api/animals/'.$pet->id.'/media', ['photo' => UploadedFile::fake()->image('memory.jpg'), 'caption' => 'Happy day'], ['Accept' => 'application/json'])->assertCreated()->json('id');
        $path = $pet->media()->findOrFail($media)->path;
        $this->actingAs($this->owner())->getJson('/api/animals/'.$pet->id.'/media/'.$media.'/file')->assertForbidden();
        $this->actingAs($owner)->deleteJson('/api/animals/'.$pet->id.'/media/'.$media)->assertOk();
        Storage::disk('local')->assertMissing($path);
        $this->post('/api/animals/'.$pet->id.'/media', ['photo' => UploadedFile::fake()->create('bad.svg', 2, 'image/svg+xml')], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_booking_conflicts_adjacent_boundaries_and_resources(): void
    {
        $owner = $this->owner();
        $pet = $this->pet($owner);
        $data = $this->bookingData($pet);
        $this->actingAs($owner)->postJson('/api/bookings', $data)->assertCreated();
        $this->postJson('/api/bookings', $data)->assertUnprocessable()->assertJsonValidationErrors('starts_at');
        $adjacent = array_replace($data, ['starts_at' => $data['ends_at'], 'ends_at' => Carbon::parse($data['ends_at'])->addMinutes(15)->toIso8601String()]);
        $this->postJson('/api/bookings', $adjacent)->assertCreated();
        $resource = BookingResource::create(['name' => 'Second team']);
        $this->postJson('/api/bookings', array_replace($data, ['resource_id' => $resource->id]))->assertCreated();
        $this->assertDatabaseCount('pf_bookings', 3);
    }

    public function test_booking_privacy_and_anonymous_availability(): void
    {
        $first = $this->owner();
        $second = $this->owner();
        $pet = $this->pet($second);
        $booking = Booking::factory()->create($this->bookingData($pet));
        $this->actingAs($first)->getJson('/api/bookings')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/availability?'.http_build_query(['resource_id' => $booking->resource_id, 'from' => now()->toIso8601String(), 'to' => now()->addWeek()->toIso8601String()]))
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonMissingPath('data.0.id')->assertJsonMissingPath('data.0.animal_id')->assertJsonMissingPath('data.0.animal');
        $this->patchJson('/api/bookings/'.$booking->id.'/status', ['status' => 'cancelled', 'reason' => 'Trying to cancel another owner'])->assertForbidden();
        $this->postJson('/api/bookings', $this->bookingData($pet))->assertForbidden();
    }

    public function test_bookings_reject_bad_dates_past_times_and_oversized_intervals(): void
    {
        $owner = $this->owner();
        $data = $this->bookingData($this->pet($owner));
        $this->actingAs($owner);
        $this->postJson('/api/bookings', array_replace($data, ['starts_at' => 'not a date']))->assertUnprocessable();
        $this->postJson('/api/bookings', array_replace($data, ['starts_at' => now()->subDay()->toIso8601String()]))->assertUnprocessable();
        $this->postJson('/api/bookings', array_replace($data, ['ends_at' => now()->addDays(2)->startOfHour()->addHours(5)->toIso8601String()]))->assertUnprocessable();
        $this->postJson('/api/bookings', array_replace($data, ['starts_at' => now()->addDay()->format('Y-m-d H:i:s')]))->assertUnprocessable();
    }

    public function test_booking_dates_are_stored_in_utc_and_status_is_explicit(): void
    {
        $owner = $this->owner();
        $data = $this->bookingData($this->pet($owner));
        $day = Carbon::parse($data['starts_at'])->toDateString();
        $data = array_replace($data, ['starts_at' => $day.'T10:00:00+08:00', 'ends_at' => $day.'T10:15:00+08:00']);
        $id = $this->actingAs($owner)->postJson('/api/bookings', $data)->assertCreated()->assertJsonPath('status', 'pending')->json('id');
        $this->assertDatabaseHas('pf_bookings', ['id' => $id, 'starts_at' => $day.' 02:00:00']);
        $this->patchJson('/api/bookings/'.$id.'/status', ['status' => 'confirmed'])->assertForbidden();
        $this->actingAs($this->staff())->patchJson('/api/bookings/'.$id.'/status', ['status' => 'confirmed'])->assertOk();
        $this->patchJson('/api/bookings/'.$id.'/status', ['status' => 'completed'])->assertUnprocessable();
        $this->patchJson('/api/bookings/'.$id.'/status', ['status' => 'cancelled', 'reason' => 'Owner changed their plans'])->assertOk();
        $this->patchJson('/api/bookings/'.$id.'/status', ['status' => 'confirmed'])->assertUnprocessable();
    }

    public function test_stock_changes_are_ledgered_and_cannot_be_overdrawn_or_edited_directly(): void
    {
        $this->actingAs($this->staff());
        $product = $this->postJson('/api/inventory', ['name' => 'Vaccine', 'sku' => 'VAC-1', 'category' => 'Vaccines', 'unit' => 'vial', 'unit_price' => 200, 'reorder_level' => 2, 'initial_quantity' => 5])->assertCreated()->json('id');
        $this->postJson('/api/inventory/'.$product.'/movements', ['type' => 'issue', 'quantity' => 3, 'reason' => 'Treatment for Milo'])->assertCreated()->assertJsonPath('balance', 2);
        $this->postJson('/api/inventory/'.$product.'/movements', ['type' => 'issue', 'quantity' => 3, 'reason' => 'Another treatment'])->assertUnprocessable();
        $this->assertDatabaseHas('pf_stock_products', ['id' => $product, 'quantity' => 2]);
        $this->assertDatabaseCount('pf_stock_movements', 2);
        $this->putJson('/api/inventory/'.$product, ['name' => 'Vaccine', 'sku' => 'VAC-1', 'category' => 'Vaccines', 'unit' => 'vial', 'unit_price' => 200, 'reorder_level' => 2, 'quantity' => 1000])->assertUnprocessable()->assertJsonValidationErrors('quantity');
    }

    public function test_expired_and_archived_products_cannot_be_issued(): void
    {
        $admin = $this->staff();
        $product = StockProduct::factory()->create(['expires_on' => today()->subDay()]);
        app(StockService::class)->move($product, 'restock', 5, 'Opening stock', $admin);
        $this->actingAs($admin)->postJson('/api/inventory/'.$product->id.'/movements', ['type' => 'issue', 'quantity' => 1, 'reason' => 'Unsafe issue'])->assertUnprocessable();
        $this->patchJson('/api/inventory/'.$product->id.'/archive', ['archived' => true])->assertOk();
        $this->postJson('/api/inventory/'.$product->id.'/movements', ['type' => 'restock', 'quantity' => 1, 'reason' => 'Archived product'])->assertUnprocessable();
        $this->assertDatabaseHas('pf_stock_products', ['id' => $product->id, 'quantity' => 5]);
    }

    public function test_visit_supply_usage_rolls_back_as_one_transaction(): void
    {
        $admin = $this->staff();
        $pet = $this->pet($this->owner());
        $one = StockProduct::factory()->create();
        $two = StockProduct::factory()->create();
        app(StockService::class)->move($one, 'restock', 5, 'Opening stock', $admin);
        $this->actingAs($admin)->postJson('/api/animals/'.$pet->id.'/encounters', [
            'summary' => 'Clinical treatment', 'seen_on' => today()->toDateString(),
            'supplies' => [['product_id' => $one->id, 'quantity' => 1], ['product_id' => $two->id, 'quantity' => 1]],
        ])->assertUnprocessable();
        $this->assertDatabaseCount('pf_encounters', 0);
        $this->assertDatabaseHas('pf_stock_products', ['id' => $one->id, 'quantity' => 5]);
        $this->assertDatabaseCount('pf_stock_movements', 1);
        $this->postJson('/api/animals/'.$pet->id.'/encounters', ['summary' => 'Clinical treatment', 'seen_on' => today()->toDateString(), 'weight_kg' => 6.2, 'supplies' => [['product_id' => $one->id, 'quantity' => 2]]])->assertCreated();
        $this->assertDatabaseHas('pf_stock_products', ['id' => $one->id, 'quantity' => 3]);
        $this->assertEquals('6.20', $pet->fresh()->weight_kg);
    }

    public function test_archives_and_batch_operations_preserve_records_and_scope_searches(): void
    {
        $owner = $this->owner();
        $pet = $this->pet($owner);
        $this->actingAs($this->staff())->postJson('/api/archive-batch', ['resource' => 'animals', 'ids' => [$pet->id], 'archived' => true])->assertOk();
        $this->getJson('/api/animals?search='.$pet->name)->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/animals?archived=1')->assertOk()->assertJsonPath('total', 1);
        $this->actingAs($owner)->getJson('/api/animals/'.$pet->id)->assertForbidden();
        $this->postJson('/api/archive-batch', ['resource' => 'animals', 'ids' => [$pet->id], 'archived' => false])->assertForbidden();
        $this->assertDatabaseCount('pf_animals', 1);
    }

    public function test_profile_updates_sync_account_and_guardian_and_require_password_for_email_changes(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner)->putJson('/api/settings/profile', ['name' => 'Updated Name', 'email' => 'updated@example.test'])->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->putJson('/api/settings/profile', ['name' => 'Updated Name', 'email' => 'updated@example.test', 'current_password' => 'SecurePassword123!', 'phone' => '+63 917 000 1234'])->assertOk();
        $this->assertDatabaseHas('pf_accounts', ['id' => $owner->id, 'name' => 'Updated Name', 'email' => 'updated@example.test']);
        $this->assertDatabaseHas('pf_guardians', ['account_id' => $owner->id, 'name' => 'Updated Name', 'email' => 'updated@example.test']);
    }

    public function test_password_reset_notification_and_reset_token_flow(): void
    {
        Notification::fake();
        $owner = $this->owner();
        $this->postJson('/api/forgot-password', ['email' => $owner->email])->assertOk();
        Notification::assertSentTo($owner, ResetPassword::class, function (ResetPassword $notification) use ($owner) {
            $this->postJson('/api/reset-password', ['email' => $owner->email, 'token' => $notification->token, 'password' => 'ReplacementPassword123!', 'password_confirmation' => 'ReplacementPassword123!'])->assertOk();

            return true;
        });
        $this->postJson('/api/login', ['email' => $owner->email, 'password' => 'ReplacementPassword123!'])->assertOk();
    }

    public function test_closed_accounts_cannot_log_in_and_records_are_retained(): void
    {
        $owner = $this->owner();
        $pet = $this->pet($owner);
        $this->actingAs($owner)->deleteJson('/api/settings/account', ['current_password' => 'SecurePassword123!'])->assertOk();
        $this->assertDatabaseHas('pf_animals', ['id' => $pet->id]);
        $this->postJson('/api/login', ['email' => $owner->email, 'password' => 'SecurePassword123!'])->assertUnprocessable();
    }

    public function test_login_is_rate_limited_and_security_headers_are_present(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', ['email' => 'missing@example.test', 'password' => 'not-a-real-password'])->assertUnprocessable();
        }
        $this->postJson('/api/login', ['email' => 'missing@example.test', 'password' => 'not-a-real-password'])->assertStatus(429);
        $this->getJson('/api/session')->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'DENY')->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_sorting_and_search_inputs_are_validated(): void
    {
        $this->actingAs($this->staff())->getJson('/api/animals?sort=password')->assertUnprocessable();
        $this->getJson('/api/guardians?direction=invalid')->assertUnprocessable();
        $this->getJson('/api/inventory?search[]=invalid')->assertUnprocessable();
    }

    public function test_dashboard_months_follow_manila_boundaries_and_today_excludes_tomorrow(): void
    {
        $this->travelTo(Carbon::parse('2026-11-15T18:00:00Z'));
        try {
            $admin = $this->staff();
            $pet = $this->pet($this->owner());
            $resource = BookingResource::create(['name' => 'Boundary care team']);
            foreach (['2026-06-30T17:00:00Z', '2026-07-31T15:00:00Z', '2026-07-31T16:00:00Z', '2026-11-15T17:00:00Z', '2026-11-16T16:00:00Z'] as $date) {
                $start = Carbon::parse($date);
                Booking::factory()->create(['animal_id' => $pet->id, 'resource_id' => $resource->id, 'starts_at' => $start, 'ends_at' => $start->copy()->addMinutes(30)]);
            }
            $data = $this->actingAs($admin)->getJson('/api/dashboard')->assertOk()->assertJsonPath('stats.today', 1)->json();
            $months = collect($data['series'])->keyBy('label');
            $this->assertSame(2, $months['Jul 2026']['bookings']);
            $this->assertSame(1, $months['Aug 2026']['bookings']);
        } finally {
            $this->travelBack();
        }
    }

    public function test_csrf_protection_rejects_cross_site_writes_without_a_token(): void
    {
        $this->app['env'] = 'local';
        $this->withHeaders(['Sec-Fetch-Site' => 'cross-site'])->postJson('/api/login', ['email' => 'test@example.test', 'password' => 'invalid'])
            ->assertStatus(419);
    }

    public function test_malformed_authentication_inputs_return_validation_errors(): void
    {
        $this->postJson('/api/login', ['email' => ['unexpected'], 'password' => ['unexpected']])->assertUnprocessable();
        $owner = $this->owner();
        $this->actingAs($owner)->putJson('/api/settings/profile', ['name' => $owner->name, 'email' => 'changed@example.test', 'current_password' => ['unexpected']])->assertUnprocessable();
        $this->putJson('/api/settings/password', ['current_password' => ['unexpected'], 'password' => 'SecureReplacement123!', 'password_confirmation' => 'SecureReplacement123!'])->assertUnprocessable();
        $this->getJson('/api/availability?'.http_build_query(['resource_id' => ['unexpected'], 'from' => now()->toIso8601String(), 'to' => now()->addDay()->toIso8601String()]))->assertUnprocessable();
    }
}
