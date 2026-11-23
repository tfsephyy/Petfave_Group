<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EmployeeAccounts
{
    /** @param array{name: string, email: string} $data
     * @return array{employee: User, temporary_password: string}
     */
    public function create(array $data, User $admin): array
    {
        return DB::transaction(function () use ($data, $admin): array {
            $password = 'PfA9!'.Str::random(19);
            $employee = new User($data + ['password' => $password]);
            $employee->forceFill(['role' => 'employee', 'must_change_password' => true, 'created_by' => $admin->id])->save();
            Audit::record('employee.created', $employee, $employee->only('name', 'email'));

            return ['employee' => $employee, 'temporary_password' => $password];
        });
    }

    /** @param array{name: string, email: string} $data */
    public function update(User $employee, array $data): User
    {
        return DB::transaction(function () use ($employee, $data): User {
            $employee = $this->lockedEmployee($employee);
            $before = $employee->only('name', 'email');
            if ($employee->email !== $data['email']) {
                $this->revokeSessions($employee);
                $employee->email_verified_at = null;
            }
            $employee->fill($data)->save();
            Audit::record('employee.updated', $employee, ['before' => $before, 'after' => $data]);

            return $employee;
        });
    }

    public function setActive(User $employee, bool $active): User
    {
        return DB::transaction(function () use ($employee, $active): User {
            $employee = $this->lockedEmployee($employee);
            $this->revokeSessions($employee);
            $employee->disabled_at = $active ? null : now();
            $employee->save();
            Audit::record($active ? 'employee.reactivated' : 'employee.deactivated', $employee);

            return $employee;
        });
    }

    /** @return array{employee: User, temporary_password: string} */
    public function resetPassword(User $employee): array
    {
        return DB::transaction(function () use ($employee): array {
            $employee = $this->lockedEmployee($employee);
            $password = 'PfA9!'.Str::random(19);
            $this->revokeSessions($employee);
            $employee->forceFill(['password' => $password, 'must_change_password' => true])->save();
            Audit::record('employee.password_reset', $employee);

            return ['employee' => $employee, 'temporary_password' => $password];
        });
    }

    private function lockedEmployee(User $employee): User
    {
        return User::where('role', 'employee')->lockForUpdate()->findOrFail($employee->id);
    }

    private function revokeSessions(User $employee): void
    {
        $employee->forceFill(['remember_token' => Str::random(60), 'session_version' => $employee->session_version + 1]);
        DB::table('sessions')->where('user_id', $employee->id)->delete();
        DB::table('password_reset_tokens')->where('email', $employee->email)->delete();
    }
}
