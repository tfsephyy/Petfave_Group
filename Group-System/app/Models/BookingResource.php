<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingResource extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'pf_booking_resources';

    protected $fillable = ['name'];

    protected $hidden = ['lock_version'];

    protected function casts(): array
    {
        return [];
    }
}
