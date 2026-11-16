<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'pf_accounts';

    protected $attributes = ['role' => 'owner'];

    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'password' => 'hashed', 'disabled_at' => 'datetime'];
    }

    public function guardian(): HasOne
    {
        return $this->hasOne(Guardian::class, 'account_id');
    }

    public function isStaff(): bool
    {
        return in_array($this->role, ['admin', 'veterinarian', 'receptionist'], true);
    }

    public function isClinician(): bool
    {
        return in_array($this->role, ['admin', 'veterinarian'], true);
    }
}
