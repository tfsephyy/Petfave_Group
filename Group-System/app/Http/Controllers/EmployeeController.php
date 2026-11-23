<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\EmployeeAccounts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => ['nullable', 'string', 'max:100'], 'status' => ['nullable', Rule::in(['all', 'active', 'disabled'])]]);
        $query = User::where('role', 'employee')->where(function ($query) use ($request): void {
            $query->where('name', 'like', '%'.$request->string('search').'%')->orWhere('email', 'like', '%'.$request->string('search').'%');
        });
        $query->when($request->input('status') === 'active', fn ($query) => $query->whereNull('disabled_at'));
        $query->when($request->input('status') === 'disabled', fn ($query) => $query->whereNotNull('disabled_at'));

        return response()->json($this->listing($request, $query, ['name', 'email', 'created_at']));
    }

    public function store(Request $request, EmployeeAccounts $accounts): JsonResponse
    {
        $data = Arr::only($request->validate($this->rules()), ['name', 'email']);

        return response()->json($accounts->create($data, $request->user()), 201);
    }

    public function update(Request $request, User $employee, EmployeeAccounts $accounts): JsonResponse
    {
        abort_unless($employee->role === 'employee', 404);

        $data = Arr::only($request->validate($this->rules($employee)), ['name', 'email']);

        return response()->json(['employee' => $accounts->update($employee, $data)]);
    }

    public function status(Request $request, User $employee, EmployeeAccounts $accounts): JsonResponse
    {
        abort_unless($employee->role === 'employee', 404);
        $data = $request->validate(['active' => ['required', 'boolean']]);

        return response()->json(['employee' => $accounts->setActive($employee, $data['active'])]);
    }

    public function resetPassword(User $employee, EmployeeAccounts $accounts): JsonResponse
    {
        abort_unless($employee->role === 'employee', 404);

        return response()->json($accounts->resetPassword($employee));
    }

    /** @return array<string, array<int, mixed>> */
    private function rules(?User $employee = null): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'lowercase', 'max:254', Rule::unique('pf_accounts', 'email')->ignore($employee?->id)],
            'role' => ['prohibited'], 'password' => ['prohibited'], 'must_change_password' => ['prohibited'],
            'session_version' => ['prohibited'], 'disabled_at' => ['prohibited'], 'created_by' => ['prohibited'], 'permissions' => ['prohibited'],
        ];
    }
}
