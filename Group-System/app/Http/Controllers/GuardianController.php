<?php

namespace App\Http\Controllers;

use App\Models\Guardian;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GuardianController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => ['nullable', 'string', 'max:100']]);
        $query = Guardian::withCount('animals')->where('name', 'like', '%'.$request->string('search').'%');
        $query->when($request->boolean('archived'), fn ($q) => $q->whereNotNull('archived_at'), fn ($q) => $q->whereNull('archived_at'));

        return response()->json($this->listing($request, $query, ['name', 'email', 'created_at']));
    }

    public function show(Guardian $guardian): JsonResponse
    {
        return response()->json($guardian->load('animals.species', 'animals.breed'));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $guardian = DB::transaction(function () use ($data) {
            $guardian = Guardian::create($data);
            Audit::record('guardian.created', $guardian);

            return $guardian;
        });

        return response()->json($guardian, 201);
    }

    public function update(Request $request, Guardian $guardian): JsonResponse
    {
        $data = $request->validate($this->rules($guardian));

        return response()->json(DB::transaction(function () use ($data, $guardian) {
            $before = $guardian->only(array_keys($data));
            $guardian->update($data);
            $guardian->account?->update(collect($data)->only('name', 'email')->all());
            Audit::record('guardian.updated', $guardian, ['before' => $before, 'after' => $data]);

            return $guardian;
        }));
    }

    public function archive(Request $request, Guardian $guardian): JsonResponse
    {
        $request->validate(['archived' => ['required', 'boolean']]);
        DB::transaction(function () use ($request, $guardian) {
            $guardian->update(['archived_at' => $request->boolean('archived') ? now() : null]);
            Audit::record($guardian->archived_at ? 'guardian.archived' : 'guardian.restored', $guardian);
        });

        return response()->json($guardian);
    }

    private function rules(?Guardian $guardian = null): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'lowercase', 'max:254', Rule::unique('pf_accounts', 'email')->ignore($guardian?->account_id)],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+().\s-]+$/'],
            'address' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'account_id' => ['prohibited'],
        ];
    }
}
