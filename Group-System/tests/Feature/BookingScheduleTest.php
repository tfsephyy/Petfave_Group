<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-11-23T07:00:00+08:00'));
    }

    private function appointment(Animal $animal, string $start = '2026-11-24T08:00:00+08:00'): array
    {
        return ['animal_id' => $animal->id, 'service' => 'Consultation', 'starts_at' => $start, 'ends_at' => Carbon::parse($start)->addMinutes(15)->toIso8601String()];
    }

    public function test_available_times_follow_clinic_hours_and_exclude_sundays_and_past_dates(): void
    {
        BookingResource::create(['name' => 'Clinic team']);
        $this->actingAs(User::factory()->create(['role' => 'admin']));
        $slots = $this->getJson('/api/availability?date=2026-11-24')->assertOk()->assertJsonCount(30, 'data')->json('data');
        $this->assertSame('2026-11-24T08:00:00+08:00', $slots[0]['starts_at']);
        $this->assertSame('2026-11-24T11:45:00+08:00', $slots[15]['starts_at']);
        $this->assertSame('2026-11-24T12:00:00+08:00', $slots[15]['ends_at']);
        $this->assertSame('2026-11-24T13:00:00+08:00', $slots[16]['starts_at']);
        $this->assertSame('2026-11-24T16:15:00+08:00', $slots[29]['starts_at']);
        $this->assertSame('2026-11-24T16:30:00+08:00', $slots[29]['ends_at']);
        $this->assertSame(['starts_at', 'ends_at'], array_keys($slots[0]));
        $this->getJson('/api/availability?date=2026-11-29')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/availability?date=2026-11-22')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/availability?date=2026-02-30')->assertUnprocessable();
        $this->getJson('/api/availability?date[]=2026-11-24')->assertUnprocessable();
    }

    public function test_elapsed_times_and_date_boundaries_use_philippine_time(): void
    {
        BookingResource::create(['name' => 'Clinic team']);
        $this->actingAs(User::factory()->create(['role' => 'admin']));
        $this->travelTo(Carbon::parse('2026-11-24T10:07:00+08:00'));
        $this->getJson('/api/availability?date=2026-11-24')->assertOk()->assertJsonCount(21, 'data')->assertJsonPath('data.0.starts_at', '2026-11-24T10:15:00+08:00');
        $this->travelTo(Carbon::parse('2026-11-24T08:30:00Z'));
        $this->getJson('/api/availability?date=2026-11-24')->assertOk()->assertJsonCount(0, 'data');
        $this->travelTo(Carbon::parse('2026-11-23T16:05:00Z'));
        $this->getJson('/api/availability?date=2026-11-23')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/availability?date=2026-11-24')->assertOk()->assertJsonCount(30, 'data');
    }

    public function test_all_booking_writes_reject_closed_hours_sundays_past_times_and_invalid_intervals(): void
    {
        $animal = Animal::factory()->create();
        BookingResource::create(['name' => 'Clinic team']);
        $this->actingAs(User::factory()->create(['role' => 'admin']));
        foreach ([
            ['2026-11-24T07:45:00+08:00', 15],
            ['2026-11-24T12:00:00+08:00', 15],
            ['2026-11-24T12:45:00+08:00', 15],
            ['2026-11-24T16:30:00+08:00', 15],
            ['2026-11-24T08:07:00+08:00', 15],
            ['2026-11-24T08:00:01+08:00', 15],
            ['2026-11-24T08:00:00+08:00', 30],
            ['2026-11-24T11:45:00+08:00', 30],
            ['2026-11-29T08:00:00+08:00', 15],
            ['2026-11-21T08:00:00+08:00', 15],
        ] as [$start, $minutes]) {
            $data = array_replace($this->appointment($animal, $start), ['ends_at' => Carbon::parse($start)->addMinutes($minutes)->toIso8601String()]);
            $this->postJson('/api/bookings', $data)->assertUnprocessable()->assertJsonValidationErrors('starts_at');
        }
        $this->assertDatabaseCount('pf_bookings', 0);
    }

    public function test_automatic_assignment_rechecks_capacity_and_cancelled_times_become_available(): void
    {
        $animal = Animal::factory()->create();
        $firstResource = BookingResource::create(['name' => 'First team']);
        $secondResource = BookingResource::create(['name' => 'Second team']);
        $this->actingAs(User::factory()->create(['role' => 'admin']));
        $data = $this->appointment($animal);
        $first = $this->postJson('/api/bookings', $data)->assertCreated()->json();
        $second = $this->postJson('/api/bookings', $data)->assertCreated()->json();
        $this->assertNotSame($first['resource_id'], $second['resource_id']);
        $this->assertEqualsCanonicalizing([$firstResource->id, $secondResource->id], [$first['resource_id'], $second['resource_id']]);
        $this->getJson('/api/availability?date=2026-11-24')->assertOk()->assertJsonCount(29, 'data')->assertJsonPath('data.0.starts_at', '2026-11-24T08:15:00+08:00');
        $this->postJson('/api/bookings', $data)->assertUnprocessable()->assertJsonValidationErrors('starts_at');
        $this->postJson('/api/bookings', $this->appointment($animal, '2026-11-24T08:15:00+08:00'))->assertCreated();
        $this->patchJson('/api/bookings/'.$first['id'].'/status', ['status' => 'cancelled', 'reason' => 'Change of plans'])->assertOk();
        $this->getJson('/api/availability?date=2026-11-24')->assertOk()->assertJsonPath('data.0.starts_at', $data['starts_at']);
        $this->postJson('/api/bookings', $data)->assertCreated();
    }

    public function test_rescheduling_excludes_only_the_authorized_booking_and_enforces_the_same_hours(): void
    {
        $animal = Animal::factory()->create();
        BookingResource::create(['name' => 'Clinic team']);
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        $data = $this->appointment($animal);
        $booking = $this->postJson('/api/bookings', $data)->assertCreated()->json();
        $this->getJson('/api/availability?date=2026-11-24&booking_id='.$booking['id'])->assertOk()->assertJsonPath('data.0.starts_at', $data['starts_at']);
        $this->actingAs(User::factory()->create())->getJson('/api/availability?date=2026-11-24&booking_id='.$booking['id'])->assertForbidden();
        $this->actingAs($admin)->putJson('/api/bookings/'.$booking['id'], $this->appointment($animal, '2026-11-29T08:00:00+08:00'))->assertUnprocessable();
        $this->putJson('/api/bookings/'.$booking['id'], $this->appointment($animal, '2026-11-25T13:00:00+08:00'))->assertOk()->assertJsonPath('resource_id', $booking['resource_id']);
        $this->getJson('/api/availability?date=2026-11-24')->assertOk()->assertJsonCount(30, 'data');
    }

    public function test_existing_longer_reservations_block_every_overlapping_slot(): void
    {
        $resource = BookingResource::create(['name' => 'Care team']);
        Booking::factory()->create(['resource_id' => $resource->id, 'starts_at' => '2026-11-24T03:30:00Z', 'ends_at' => '2026-11-24T04:00:00Z']);
        $this->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/api/availability?date=2026-11-24')->assertOk()->assertJsonCount(28, 'data')->assertJsonMissing(['starts_at' => '2026-11-24T11:30:00+08:00'])->assertJsonMissing(['starts_at' => '2026-11-24T11:45:00+08:00']);
    }

    public function test_no_capacity_is_offered_when_the_clinic_has_no_resources(): void
    {
        $animal = Animal::factory()->create();
        $this->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/api/availability?date=2026-11-24')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/bookings', $this->appointment($animal))->assertUnprocessable();
    }
}
