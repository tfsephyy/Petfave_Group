<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RailwayDeploymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_seed_data_is_available_and_safe_to_seed_again(): void
    {
        $this->seed();

        $admin = User::where('email', 'jasemsem111@gmail.com')->firstOrFail();
        $this->assertSame('admin', $admin->role);
        $this->assertNotNull($admin->guardian);
        $admin->update(['password' => 'UpdatedPassword123!']);

        $this->seed();

        $this->assertDatabaseCount('pf_species', 20);
        $this->assertDatabaseCount('pf_breeds', 26);
        $this->assertDatabaseCount('pf_booking_resources', 2);
        $this->assertDatabaseCount('pf_accounts', 1);
        $this->assertDatabaseCount('pf_guardians', 1);
        $this->assertTrue(Hash::check('UpdatedPassword123!', $admin->fresh()->password));

        $this->getJson('/api/session')->assertOk()->assertJsonStructure(['user', 'csrf_token']);
        $this->postJson('/api/login', ['email' => $admin->email, 'password' => 'UpdatedPassword123!'])
            ->assertOk()->assertJsonPath('user.role', 'admin');
        $this->getJson('/api/options')->assertOk();
        $this->getJson('/api/dashboard')->assertOk();
    }
}
