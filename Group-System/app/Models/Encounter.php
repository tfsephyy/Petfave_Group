<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Encounter extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'pf_encounters';

    protected $fillable = ['animal_id', 'booking_id', 'author_id', 'seen_on', 'summary', 'diagnosis', 'plan', 'weight_kg'];

    protected function casts(): array
    {
        return ['seen_on' => 'date:Y-m-d', 'weight_kg' => 'decimal:2'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id')->select('id', 'name');
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(ClinicalEntry::class);
    }
}
