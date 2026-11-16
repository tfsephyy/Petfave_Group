<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetMedia extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'pf_pet_media';

    protected $fillable = ['animal_id', 'uploaded_by', 'path', 'caption'];

    protected $hidden = ['path'];

    protected $appends = ['url'];

    protected function casts(): array
    {
        return [];
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function getUrlAttribute(): string
    {
        return '/api/animals/'.$this->animal_id.'/media/'.$this->id.'/file';
    }
}
