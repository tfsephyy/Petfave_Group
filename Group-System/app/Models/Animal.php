<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Animal extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'pf_animals';

    protected $fillable = ['guardian_id', 'species_id', 'breed_id', 'name', 'sex', 'birth_date', 'microchip', 'weight_kg', 'color', 'notes', 'photo_path', 'archived_at'];

    protected $hidden = ['photo_path'];

    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return ['archived_at' => 'datetime', 'birth_date' => 'date:Y-m-d', 'weight_kg' => 'decimal:2'];
    }

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }

    public function species(): BelongsTo
    {
        return $this->belongsTo(Species::class, 'species_id');
    }

    public function breed(): BelongsTo
    {
        return $this->belongsTo(Breed::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(ClinicalEntry::class);
    }

    public function encounters(): HasMany
    {
        return $this->hasMany(Encounter::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(PetMedia::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $user->isStaff() ? $query : $query->whereNull('archived_at')->whereHas('guardian', fn (Builder $owners) => $owners->where('account_id', $user->id));
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? '/api/animals/'.$this->id.'/photo?v='.substr(hash('sha256', $this->photo_path), 0, 16) : null;
    }
}
