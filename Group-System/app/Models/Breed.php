<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Breed extends Model
{
    use HasFactory;

    protected $table = 'pf_breeds';

    protected $fillable = ['name', 'species_id'];

    public $timestamps = false;

    protected function casts(): array
    {
        return [];
    }

    public function species(): BelongsTo
    {
        return $this->belongsTo(Species::class, 'species_id');
    }
}
