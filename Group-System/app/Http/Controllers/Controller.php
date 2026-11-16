<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

abstract class Controller
{
    use AuthorizesRequests;

    protected function listing(Request $request, Builder $query, array $columns, string $default = 'created_at'): LengthAwarePaginator
    {
        $values = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in($columns)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'archived' => ['nullable', 'boolean'],
        ]);

        return $query->orderBy($values['sort'] ?? $default, $values['direction'] ?? 'desc')->paginate($values['per_page'] ?? 10);
    }
}
