<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Species extends Model
{
    use HasFactory;

    protected $table = 'pf_species';

    protected $fillable = ['name'];

    public $timestamps = false;

    protected function casts(): array
    {
        return [];
    }

    public function breeds(): HasMany
    {
        return $this->hasMany(Breed::class, 'species_id');
    }
}
