<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use App\Models\StockProduct;
use App\Services\Audit;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['low_stock' => ['nullable', 'boolean'], 'search' => ['nullable', 'string', 'max:100']]);
        $query = StockProduct::where(fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%')->orWhere('sku', 'like', '%'.$request->string('search').'%'));
        $query->when($request->boolean('archived'), fn ($q) => $q->whereNotNull('archived_at'), fn ($q) => $q->whereNull('archived_at'));
        $query->when($request->boolean('low_stock'), fn ($q) => $q->whereColumn('quantity', '<=', 'reorder_level'));

        return response()->json($this->listing($request, $query, ['name', 'quantity', 'expires_on', 'created_at']));
    }

    public function store(Request $request, StockService $service): JsonResponse
    {
        $data = $request->validate($this->rules() + ['initial_quantity' => ['nullable', 'integer', 'min:0', 'max:1000000']]);
        $product = DB::transaction(function () use ($data, $request, $service) {
            $product = StockProduct::create(collect($data)->except('initial_quantity')->all());
            Audit::record('inventory.product_created', $product);
            if (($data['initial_quantity'] ?? 0) > 0) {
                $service->move($product, 'restock', $data['initial_quantity'], 'Opening stock', $request->user());
            }

            return $product->refresh();
        });

        return response()->json($product, 201);
    }

    public function update(Request $request, StockProduct $product): JsonResponse
    {
        $data = $request->validate($this->rules($product));
        DB::transaction(function () use ($product, $data) {
            $before = $product->only(array_keys($data));
            $product->update($data);
            Audit::record('inventory.product_updated', $product, ['before' => $before, 'after' => $data]);
        });

        return response()->json($product);
    }

    public function movement(Request $request, StockProduct $product, StockService $service): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['restock', 'issue'])],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        return response()->json($service->move($product, $data['type'], $data['quantity'], $data['reason'], $request->user()), 201);
    }

    public function history(Request $request): JsonResponse
    {
        $request->validate(['product_id' => ['nullable', 'ulid', 'exists:pf_stock_products,id']]);
        $query = StockMovement::with('product:id,name,sku,unit', 'actor')
            ->when($request->filled('product_id'), fn ($q) => $q->where('product_id', $request->input('product_id')));

        return response()->json($this->listing($request, $query, ['created_at', 'type']));
    }

    public function archive(Request $request, StockProduct $product): JsonResponse
    {
        $request->validate(['archived' => ['required', 'boolean']]);
        DB::transaction(function () use ($request, $product) {
            $product->update(['archived_at' => $request->boolean('archived') ? now() : null]);
            Audit::record($product->archived_at ? 'inventory.archived' : 'inventory.restored', $product);
        });

        return response()->json($product);
    }

    private function rules(?StockProduct $product = null): array
    {
        return [
            'name' => ['required', 'string', 'max:140'],
            'sku' => ['required', 'string', 'max:60', Rule::unique('pf_stock_products')->ignore($product)],
            'category' => ['required', 'string', 'max:60'],
            'unit' => ['required', 'string', 'max:30'],
            'description' => ['nullable', 'string', 'max:3000'],
            'unit_price' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'reorder_level' => ['required', 'integer', 'min:0', 'max:1000000'],
            'expires_on' => ['nullable', 'date_format:Y-m-d'],
            'quantity' => ['prohibited'],
        ];
    }
}
