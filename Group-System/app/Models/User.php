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

    protected $attributes = ['role' => 'owner', 'must_change_password' => false, 'session_version' => 0];

    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token', 'session_version'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'password' => 'hashed', 'disabled_at' => 'datetime', 'must_change_password' => 'boolean', 'session_version' => 'integer'];
    }

    public function guardian(): HasOne
    {
        return $this->hasOne(Guardian::class, 'account_id');
    }

    public function isStaff(): bool
    {
        return in_array($this->role, ['admin', 'veterinarian', 'receptionist', 'employee'], true);
    }

    public function isClinician(): bool
    {
        return in_array($this->role, ['admin', 'veterinarian'], true);
    }
}
