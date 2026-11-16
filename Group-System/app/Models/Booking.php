<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'pf_bookings';

    protected $fillable = ['animal_id', 'resource_id', 'created_by', 'service', 'status', 'starts_at', 'ends_at', 'notes', 'cancellation_reason', 'completed_at'];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'completed_at' => 'datetime'];
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function resource(): BelongsTo
    {
        return $this->belongsTo(BookingResource::class);
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $user->isStaff() ? $query : $query->whereHas('animal.guardian', fn (Builder $owners) => $owners->where('account_id', $user->id));
    }
}
