<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditEvent extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'pf_audit_events';

    protected $fillable = ['actor_id', 'action', 'subject_type', 'subject_id', 'changes'];

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['changes' => 'array', 'created_at' => 'datetime'];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id')->select('id', 'name');
    }
}
