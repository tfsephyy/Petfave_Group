<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveAnimalRequest;
use App\Models\Animal;
use App\Models\BookingResource;
use App\Models\Breed;
use App\Models\Guardian;
use App\Models\Species;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AnimalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => ['nullable', 'string', 'max:100']]);
        $query = Animal::visibleTo($request->user())->with(['guardian:id,name', 'species', 'breed'])
            ->where('name', 'like', '%'.$request->string('search').'%');
        $query->when($request->boolean('archived') && $request->user()->isStaff(), fn ($q) => $q->whereNotNull('archived_at'), fn ($q) => $q->whereNull('archived_at'));

        return response()->json($this->listing($request, $query, ['name', 'birth_date', 'created_at']));
    }

    public function options(Request $request): JsonResponse
    {
        return response()->json([
            'species' => Species::with('breeds')->orderBy('name')->get(),
            'resources' => BookingResource::select('id', 'name')->orderBy('name')->get(),
            'guardians' => $request->user()->isStaff() ? Guardian::whereNull('archived_at')->orderBy('name')->get(['id', 'name', 'email']) : [],
            'animals' => Animal::visibleTo($request->user())->whereNull('archived_at')->with('guardian:id,name')->orderBy('name')->get(['id', 'name', 'guardian_id']),
        ]);
    }

    public function show(Animal $animal): JsonResponse
    {
        $this->authorize('view', $animal);
        Audit::record('animal.viewed', $animal);

        return response()->json($animal->load(['guardian:id,name,email,phone', 'species', 'breed', 'bookings' => fn ($q) => $q->latest('starts_at')->limit(100),
            'entries' => fn ($query) => $query->with('author')->orderByDesc('recorded_on'),
            'encounters' => fn ($query) => $query->with('author')->orderByDesc('seen_on'),
            'media' => fn ($query) => $query->latest(),
        ]));
    }

    public function store(SaveAnimalRequest $request): JsonResponse
    {
        $data = $request->validated();
        if (! $request->user()->isStaff()) {
            $data['guardian_id'] = $request->user()->guardian()->firstOrFail()->id;
        }
        $animal = DB::transaction(function () use ($data) {
            $animal = Animal::create($this->resolveClassification($data));
            Audit::record('animal.registered', $animal);

            return $animal;
        });

        return response()->json($animal, 201);
    }

    public function update(SaveAnimalRequest $request, Animal $animal): JsonResponse
    {
        DB::transaction(function () use ($request, $animal) {
            $data = $this->resolveClassification($request->validated());
            $before = $animal->only(array_keys($data));
            $animal->update($data);
            Audit::record('animal.updated', $animal, ['before' => $before, 'after' => $data]);
        });

        return response()->json($animal);
    }

    public function archive(Request $request, Animal $animal): JsonResponse
    {
        $this->authorize('archive', $animal);
        $request->validate(['archived' => ['required', 'boolean']]);
        DB::transaction(function () use ($request, $animal) {
            $animal->update(['archived_at' => $request->boolean('archived') ? now() : null]);
            Audit::record($animal->archived_at ? 'animal.archived' : 'animal.restored', $animal);
        });

        return response()->json($animal);
    }

    private function resolveClassification(array $data): array
    {
        if (! empty($data['custom_species'])) {
            $species = Species::firstOrCreate(['name' => Str::title(Str::squish($data['custom_species']))]);
            $data['species_id'] = $species->id;
        }
        if (! empty($data['custom_breed'])) {
            $breed = Breed::firstOrCreate(['species_id' => $data['species_id'], 'name' => Str::title(Str::squish($data['custom_breed']))]);
            $data['breed_id'] = $breed->id;
        }
        unset($data['custom_species'], $data['custom_breed']);

        return $data;
    }
}
