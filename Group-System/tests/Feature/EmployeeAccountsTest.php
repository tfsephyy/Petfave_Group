<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\AuditEvent;
use App\Models\BookingResource;
use App\Models\Species;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmployeeAccountsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function employee(bool $needsPassword = false): User
    {
        return User::factory()->create(['role' => 'employee', 'password' => 'EmployeePassword123!', 'must_change_password' => $needsPassword]);
    }

    /** @return array{employee: array<string, mixed>, temporary_password: string} */
    private function createEmployee(): array
    {
        return $this->actingAs($this->admin())->postJson('/api/employees', ['name' => 'Clinic Employee', 'email' => 'employee@example.test'])
            ->assertCreated()->assertHeader('Cache-Control', 'no-store, private')->json();
    }

    public function test_admin_creates_employee_with_one_time_hashed_credentials_and_no_guardian(): void
    {
        $data = $this->createEmployee();
        $employee = User::findOrFail($data['employee']['id']);
        $this->assertSame('employee', $employee->role);
        $this->assertTrue($employee->must_change_password);
        $this->assertNotNull($employee->created_by);
        $this->assertTrue(Hash::check($data['temporary_password'], $employee->password));
        $this->assertDatabaseCount('pf_guardians', 0);
        $this->assertArrayNotHasKey('password', $data['employee']);
        $this->assertArrayNotHasKey('session_version', $data['employee']);
        $this->getJson('/api/employees')->assertOk()->assertJsonCount(1, 'data')->assertJsonMissingPath('data.0.password')->assertJsonMissingPath('data.0.temporary_password');
        $this->assertStringNotContainsString($data['temporary_password'], AuditEvent::all()->toJson());
        $this->assertDatabaseHas('pf_audit_events', ['action' => 'employee.created', 'subject_id' => (string) $employee->id]);
    }

    public function test_only_administrators_can_manage_employee_accounts(): void
    {
        $employee = $this->employee();
        $this->getJson('/api/employees')->assertUnauthorized();
        foreach (['owner', 'receptionist', 'veterinarian', 'employee'] as $role) {
            $actor = User::factory()->create(['role' => $role]);
            $this->actingAs($actor)->withSession(['employee_session_version' => 0]);
            $this->getJson('/api/employees')->assertForbidden();
            $this->postJson('/api/employees', ['name' => 'Unauthorized', 'email' => 'unauthorized@example.test'])->assertForbidden();
            $this->putJson('/api/employees/'.$employee->id, ['name' => 'Unauthorized', 'email' => $employee->email])->assertForbidden();
            $this->patchJson('/api/employees/'.$employee->id.'/status', ['active' => false])->assertForbidden();
            $this->postJson('/api/employees/'.$employee->id.'/reset-password')->assertForbidden();
        }
    }

    public function test_employee_must_change_password_before_using_the_account(): void
    {
        $data = $this->createEmployee();
        $this->postJson('/api/logout')->assertOk();
        $this->postJson('/api/login', ['email' => $data['employee']['email'], 'password' => $data['temporary_password']])->assertOk()->assertJsonPath('user.must_change_password', true);
        $this->getJson('/api/session')->assertOk()->assertJsonPath('user.must_change_password', true);
        foreach (['dashboard', 'animals', 'options', 'bookings', 'employees'] as $module) {
            $this->getJson('/api/'.$module)->assertStatus(423)->assertJsonPath('code', 'password_change_required');
        }
        $this->putJson('/api/settings/profile', ['name' => 'Bypass', 'email' => $data['employee']['email'], 'must_change_password' => false])->assertStatus(423);
        $password = ['current_password' => $data['temporary_password'], 'password' => 'MyEmployeePassword123!', 'password_confirmation' => 'MyEmployeePassword123!'];
        $this->putJson('/api/settings/password', array_replace($password, ['current_password' => 'wrong']))->assertUnprocessable();
        $this->putJson('/api/settings/password', array_replace($password, ['password' => 'weak', 'password_confirmation' => 'weak']))->assertUnprocessable();
        $this->putJson('/api/settings/password', $password)->assertOk()->assertJsonPath('user.must_change_password', false)->assertJsonPath('user.role', 'employee');
        $this->getJson('/api/session')->assertOk()->assertJsonPath('user.must_change_password', false);
        $this->putJson('/api/settings/profile', ['name' => 'Updated Employee', 'email' => $data['employee']['email']])->assertOk()->assertJsonPath('user.name', 'Updated Employee');
        $this->putJson('/api/settings/profile', ['name' => 'Updated Employee', 'email' => $data['employee']['email'], 'role' => 'admin'])->assertUnprocessable();
        $this->postJson('/api/logout')->assertOk();
        $this->postJson('/api/login', ['email' => $data['employee']['email'], 'password' => $data['temporary_password']])->assertUnprocessable();
        $this->postJson('/api/login', ['email' => $data['employee']['email'], 'password' => $password['password']])->assertOk()->assertJsonPath('user.must_change_password', false);
    }

    public function test_employee_can_access_clinic_modules_after_password_setup(): void
    {
        $employee = $this->employee();
        $animal = Animal::factory()->create();
        $this->actingAs($employee)->withSession(['employee_session_version' => 0]);
        foreach (['dashboard', 'animals', 'animals/'.$animal->id, 'guardians', 'options', 'bookings', 'availability?date=2026-12-01', 'inventory', 'stock-movements'] as $module) {
            $this->getJson('/api/'.$module)->assertOk();
        }
        $this->getJson('/api/animals')->assertJsonPath('data.0.id', $animal->id);
        foreach (['audit', 'employees'] as $module) {
            $this->getJson('/api/'.$module)->assertForbidden();
        }
        $this->postJson('/api/animals/'.$animal->id.'/entries', [])->assertForbidden();
        $this->postJson('/api/animals/'.$animal->id.'/encounters', [])->assertForbidden();
        $this->deleteJson('/api/settings/account', ['current_password' => 'EmployeePassword123!'])->assertForbidden();
        $this->getJson('/api/session')->assertOk()->assertJsonPath('user.id', $employee->id);
    }

    public function test_employee_can_manage_pet_parents_and_patient_profiles(): void
    {
        $this->actingAs($this->employee())->withSession(['employee_session_version' => 0]);
        $parentData = ['name' => 'Employee Managed Parent', 'email' => 'managed-parent@example.test'];
        $guardian = $this->postJson('/api/guardians', $parentData)->assertCreated()->json();
        $this->putJson('/api/guardians/'.$guardian['id'], $parentData + ['phone' => '+63 917 555 0123'])
            ->assertOk()->assertJsonPath('phone', '+63 917 555 0123');
        $this->getJson('/api/guardians/'.$guardian['id'])->assertOk();

        $animalData = ['guardian_id' => $guardian['id'], 'species_id' => Species::firstOrCreate(['name' => 'Dog'])->id, 'name' => 'Employee Managed Pet', 'sex' => 'female'];
        $animal = $this->postJson('/api/animals', $animalData)->assertCreated()->json();
        $this->putJson('/api/animals/'.$animal['id'], array_replace($animalData, ['name' => 'Updated Patient']))
            ->assertOk()->assertJsonPath('name', 'Updated Patient');
        $this->patchJson('/api/animals/'.$animal['id'].'/archive', ['archived' => true])->assertOk();
        $this->assertDatabaseHas('pf_animals', ['id' => $animal['id'], 'name' => 'Updated Patient']);
        $this->patchJson('/api/animals/'.$animal['id'].'/archive', ['archived' => false])->assertOk()->assertJsonPath('archived_at', null);
        $this->postJson('/api/archive-batch', ['resource' => 'guardians', 'ids' => [$guardian['id']], 'archived' => true])->assertOk();
        $this->patchJson('/api/guardians/'.$guardian['id'].'/archive', ['archived' => false])->assertOk()->assertJsonPath('archived_at', null);
        $this->assertDatabaseHas('pf_guardians', ['id' => $guardian['id'], 'account_id' => null, 'phone' => '+63 917 555 0123']);
    }

    public function test_employee_can_create_reschedule_confirm_and_cancel_appointments(): void
    {
        $employee = $this->employee();
        $animal = Animal::factory()->create();
        $resource = BookingResource::firstOrCreate(['name' => 'Employee care team']);
        $start = now('Asia/Manila')->addDays(2)->setTime(9, 0);
        if ($start->isSunday()) {
            $start->addDay();
        }
        $data = ['animal_id' => $animal->id, 'resource_id' => $resource->id, 'service' => 'Consultation', 'starts_at' => $start->toIso8601String(), 'ends_at' => $start->copy()->addMinutes(15)->toIso8601String()];
        $this->actingAs($employee)->withSession(['employee_session_version' => 0]);
        $booking = $this->postJson('/api/bookings', $data)->assertCreated()->assertJsonPath('status', 'pending')->json();
        $this->patchJson('/api/bookings/'.$booking['id'].'/status', ['status' => 'confirmed'])->assertOk()->assertJsonPath('status', 'confirmed');
        $this->putJson('/api/bookings/'.$booking['id'], array_replace($data, ['starts_at' => $start->copy()->addMinutes(15)->toIso8601String(), 'ends_at' => $start->copy()->addMinutes(30)->toIso8601String()]))
            ->assertOk()->assertJsonPath('status', 'confirmed');
        $this->patchJson('/api/bookings/'.$booking['id'].'/status', ['status' => 'cancelled', 'reason' => 'Pet parent requested cancellation'])
            ->assertOk()->assertJsonPath('status', 'cancelled');
        $this->assertDatabaseHas('pf_bookings', ['id' => $booking['id'], 'created_by' => $employee->id, 'status' => 'cancelled']);
    }

    public function test_employee_can_manage_inventory_and_stock_movements(): void
    {
        $employee = $this->employee();
        $this->actingAs($employee)->withSession(['employee_session_version' => 0]);
        $data = ['name' => 'Employee Supplies', 'sku' => 'EMPLOYEE-001', 'category' => 'Consumables', 'unit' => 'unit', 'unit_price' => 100, 'reorder_level' => 2];
        $product = $this->postJson('/api/inventory', $data + ['initial_quantity' => 5])->assertCreated()->assertJsonPath('quantity', 5)->json();
        $this->putJson('/api/inventory/'.$product['id'], array_replace($data, ['name' => 'Updated Supplies']))->assertOk()->assertJsonPath('name', 'Updated Supplies');
        $this->postJson('/api/inventory/'.$product['id'].'/movements', ['type' => 'restock', 'quantity' => 3, 'reason' => 'Employee restock'])->assertCreated();
        $this->postJson('/api/inventory/'.$product['id'].'/movements', ['type' => 'issue', 'quantity' => 2, 'reason' => 'Employee issue'])->assertCreated();
        $this->getJson('/api/stock-movements?product_id='.$product['id'])->assertOk()->assertJsonCount(3, 'data');
        $this->assertDatabaseHas('pf_stock_products', ['id' => $product['id'], 'quantity' => 6]);
        $this->assertDatabaseHas('pf_stock_movements', ['product_id' => $product['id'], 'actor_id' => $employee->id, 'type' => 'issue', 'delta' => -2, 'balance' => 6]);
        $this->patchJson('/api/inventory/'.$product['id'].'/archive', ['archived' => true])->assertOk();
        $this->patchJson('/api/inventory/'.$product['id'].'/archive', ['archived' => false])->assertOk()->assertJsonPath('archived_at', null);
    }

    public function test_admin_validation_and_employee_only_scope_prevent_privilege_changes(): void
    {
        $employee = $this->employee();
        $owner = User::factory()->create();
        $admin = $this->admin();
        $this->actingAs($admin);
        $this->postJson('/api/employees', ['name' => 'Duplicate', 'email' => $owner->email])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson('/api/employees', ['name' => 'Injected', 'email' => 'injected@example.test', 'role' => 'admin', 'password' => 'ChosenPassword123!'])->assertUnprocessable()->assertJsonValidationErrors(['role', 'password']);
        $this->putJson('/api/employees/'.$employee->id, ['name' => 'Injected', 'email' => $employee->email, 'must_change_password' => false, 'session_version' => 99, 'disabled_at' => now()->toIso8601String()])->assertUnprocessable();
        foreach ([$admin, $owner] as $account) {
            $this->putJson('/api/employees/'.$account->id, ['name' => 'Wrong role', 'email' => $account->email])->assertNotFound();
            $this->postJson('/api/employees/'.$account->id.'/reset-password')->assertNotFound();
            $this->patchJson('/api/employees/'.$account->id.'/status', ['active' => false])->assertNotFound();
        }
        $this->putJson('/api/employees/'.$employee->id, ['name' => 'Updated Employee', 'email' => $employee->email])->assertOk()->assertJsonPath('employee.name', 'Updated Employee');
        $this->assertSame('employee', $employee->fresh()->role);
    }

    public function test_deactivation_and_reactivation_never_restore_an_old_session(): void
    {
        $employee = $this->employee();
        DB::table('sessions')->insert(['id' => 'employee-session', 'user_id' => $employee->id, 'payload' => '', 'last_activity' => time()]);
        $admin = $this->admin();
        $this->actingAs($admin)->patchJson('/api/employees/'.$employee->id.'/status', ['active' => false])->assertOk();
        $this->assertDatabaseMissing('sessions', ['id' => 'employee-session']);
        $this->postJson('/api/logout');
        $this->postJson('/api/login', ['email' => $employee->email, 'password' => 'EmployeePassword123!'])->assertUnprocessable();
        $this->actingAs($admin)->patchJson('/api/employees/'.$employee->id.'/status', ['active' => true])->assertOk();
        $this->actingAs($employee->fresh())->withSession(['employee_session_version' => 0]);
        $this->putJson('/api/settings/profile', ['name' => $employee->name, 'email' => $employee->email])->assertUnauthorized();
        $this->postJson('/api/login', ['email' => $employee->email, 'password' => 'EmployeePassword123!'])->assertOk();
        $this->assertDatabaseHas('pf_audit_events', ['action' => 'employee.deactivated', 'subject_id' => (string) $employee->id]);
        $this->assertDatabaseHas('pf_audit_events', ['action' => 'employee.reactivated', 'subject_id' => (string) $employee->id]);
    }

    public function test_admin_password_reset_revokes_sessions_and_old_credentials_and_tokens(): void
    {
        $employee = $this->employee();
        DB::table('sessions')->insert(['id' => 'employee-session', 'user_id' => $employee->id, 'payload' => '', 'last_activity' => time()]);
        DB::table('password_reset_tokens')->insert(['email' => $employee->email, 'token' => 'old-token', 'created_at' => now()]);
        $result = $this->actingAs($this->admin())->postJson('/api/employees/'.$employee->id.'/reset-password')->assertOk()->assertJsonPath('employee.must_change_password', true)->json();
        $this->assertDatabaseMissing('sessions', ['id' => 'employee-session']);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $employee->email]);
        $this->assertTrue(Hash::check($result['temporary_password'], $employee->fresh()->password));
        $this->assertFalse(Hash::check('EmployeePassword123!', $employee->fresh()->password));
        $this->actingAs($employee->fresh())->withSession(['employee_session_version' => 0])->getJson('/api/session')->assertOk()->assertJsonPath('user', null);
        $this->postJson('/api/login', ['email' => $employee->email, 'password' => $result['temporary_password']])->assertOk()->assertJsonPath('user.must_change_password', true);
        $this->assertStringNotContainsString($result['temporary_password'], AuditEvent::all()->toJson());
    }

    public function test_admin_email_changes_invalidate_sessions_and_list_filters_do_not_expose_other_roles(): void
    {
        $employee = $this->employee();
        $disabled = User::factory()->create(['role' => 'employee', 'disabled_at' => now()]);
        $admin = $this->admin();
        $this->actingAs($admin)->getJson('/api/employees?status=active')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $employee->id);
        $this->getJson('/api/employees?status=disabled')->assertOk()->assertJsonPath('data.0.id', $disabled->id);
        $this->getJson('/api/employees?search='.urlencode($employee->email))->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/employees?sort=password')->assertUnprocessable();
        $this->putJson('/api/employees/'.$employee->id, ['name' => 'New Name', 'email' => 'new-employee@example.test'])->assertOk();
        $this->assertSame(1, $employee->fresh()->session_version);
        $this->assertDatabaseHas('pf_accounts', ['id' => $employee->id, 'email' => 'new-employee@example.test']);
        $this->assertDatabaseCount('pf_guardians', 0);
    }

    public function test_password_recovery_completes_employee_password_setup(): void
    {
        Notification::fake();
        $employee = $this->employee(true);
        $this->postJson('/api/forgot-password', ['email' => $employee->email])->assertOk();
        Notification::assertSentTo($employee, ResetPassword::class, function (ResetPassword $notification) use ($employee): bool {
            $this->postJson('/api/reset-password', ['email' => $employee->email, 'token' => $notification->token, 'password' => 'RecoveredEmployee123!', 'password_confirmation' => 'RecoveredEmployee123!'])->assertOk();

            return true;
        });
        $this->assertFalse($employee->fresh()->must_change_password);
        $this->postJson('/api/login', ['email' => $employee->email, 'password' => 'RecoveredEmployee123!'])->assertOk()->assertJsonPath('user.must_change_password', false);
    }
}
