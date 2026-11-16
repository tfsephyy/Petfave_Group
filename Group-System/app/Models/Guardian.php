<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Guardian extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'pf_guardians';

    protected $fillable = ['account_id', 'name', 'email', 'phone', 'address', 'notes', 'archived_at'];

    protected function casts(): array
    {
        return ['archived_at' => 'datetime'];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(User::class, 'account_id');
    }

    public function animals(): HasMany
    {
        return $this->hasMany(Animal::class);
    }
}
