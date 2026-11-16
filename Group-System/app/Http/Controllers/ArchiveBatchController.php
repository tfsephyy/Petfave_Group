<?php

namespace App\Http\Controllers;

use App\Models\Animal;
use App\Models\Guardian;
use App\Models\StockProduct;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ArchiveBatchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'resource' => ['required', Rule::in(['animals', 'guardians', 'inventory'])],
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['required', 'ulid', 'distinct'],
            'archived' => ['required', 'boolean'],
        ]);
        $model = ['animals' => Animal::class, 'guardians' => Guardian::class, 'inventory' => StockProduct::class][$data['resource']];
        DB::transaction(function () use ($model, $data) {
            $records = $model::whereIn('id', $data['ids'])->lockForUpdate()->get();
            abort_unless($records->count() === count($data['ids']), 422, 'One or more records no longer exist.');
            foreach ($records as $record) {
                $record->update(['archived_at' => $data['archived'] ? now() : null]);
                Audit::record($data['archived'] ? 'record.archived' : 'record.restored', $record);
            }
        });

        return response()->json(['message' => 'Selected records updated.']);
    }
}
