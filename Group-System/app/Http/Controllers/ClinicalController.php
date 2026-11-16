<?php

namespace App\Http\Controllers;

use App\Models\Animal;
use App\Models\StockProduct;
use App\Services\Audit;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClinicalController extends Controller
{
    public function store(Request $request, Animal $animal): JsonResponse
    {
        $this->authorize('clinical', $animal);
        $data = $request->validate($this->rules($animal));
        $entry = DB::transaction(function () use ($animal, $request, $data) {
            $entry = $animal->entries()->create($data + ['author_id' => $request->user()->id]);
            Audit::record('clinical.recorded', $entry);

            return $entry;
        });

        return response()->json($entry->load('author'), 201);
    }

    public function update(Request $request, Animal $animal, string $entry): JsonResponse
    {
        $this->authorize('clinical', $animal);
        $record = $animal->entries()->whereNull('voided_at')->findOrFail($entry);
        $data = $request->validate($this->rules($animal) + ['correction_reason' => ['required', 'string', 'min:5', 'max:500']]);
        DB::transaction(function () use ($record, $data) {
            $values = collect($data)->except('correction_reason')->all();
            $before = $record->only(array_keys($values));
            $record->update($values);
            Audit::record('clinical.corrected', $record, ['before' => $before, 'after' => $values, 'reason' => $data['correction_reason']]);
        });

        return response()->json($record->load('author'));
    }

    public function void(Request $request, Animal $animal, string $entry): JsonResponse
    {
        $this->authorize('clinical', $animal);
        $record = $animal->entries()->whereNull('voided_at')->findOrFail($entry);
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:500']]);
        DB::transaction(function () use ($record, $data) {
            $record->update(['voided_at' => now(), 'void_reason' => $data['reason']]);
            Audit::record('clinical.voided', $record, ['reason' => $data['reason']]);
        });

        return response()->json($record);
    }

    public function encounter(Request $request, Animal $animal, StockService $stock): JsonResponse
    {
        $this->authorize('clinical', $animal);
        $data = $request->validate([
            'summary' => ['required', 'string', 'max:200'],
            'seen_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.now('Asia/Manila')->toDateString()],
            'diagnosis' => ['nullable', 'string', 'max:5000'],
            'plan' => ['nullable', 'string', 'max:5000'],
            'weight_kg' => ['nullable', 'numeric', 'min:0.01', 'max:99999'],
            'booking_id' => ['nullable', Rule::exists('pf_bookings', 'id')->where('animal_id', $animal->id), 'unique:pf_encounters,booking_id'],
            'supplies' => ['nullable', 'array', 'max:20'],
            'supplies.*.product_id' => ['required', 'distinct', 'exists:pf_stock_products,id'],
            'supplies.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'author_id' => ['prohibited'], 'animal_id' => ['prohibited'],
        ]);
        $encounter = DB::transaction(function () use ($animal, $data, $request, $stock) {
            $encounter = $animal->encounters()->create(collect($data)->except('supplies')->all() + ['author_id' => $request->user()->id]);
            foreach ($data['supplies'] ?? [] as $supply) {
                $stock->move(StockProduct::findOrFail($supply['product_id']), 'issue', $supply['quantity'], 'Treatment for '.$animal->name.': '.$data['summary'], $request->user(), $encounter->id);
            }
            if (isset($data['weight_kg'])) {
                $animal->update(['weight_kg' => $data['weight_kg']]);
            }
            Audit::record('encounter.recorded', $encounter);

            return $encounter;
        }, 3);

        return response()->json($encounter->load('author'), 201);
    }

    private function rules(Animal $animal): array
    {
        return [
            'kind' => ['required', Rule::in(['consultation', 'vaccination', 'medication', 'surgery'])],
            'title' => ['required', 'string', 'max:180'],
            'recorded_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.now('Asia/Manila')->toDateString()],
            'due_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:recorded_on'],
            'encounter_id' => ['nullable', Rule::exists('pf_encounters', 'id')->where('animal_id', $animal->id)],
            'dosage' => ['nullable', 'string', 'max:120'],
            'frequency' => ['nullable', 'string', 'max:120'],
            'batch_number' => ['nullable', 'string', 'max:80'],
            'findings' => ['nullable', 'string', 'max:5000'],
            'treatment' => ['nullable', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'author_id' => ['prohibited'], 'animal_id' => ['prohibited'], 'voided_at' => ['prohibited'],
        ];
    }
}
