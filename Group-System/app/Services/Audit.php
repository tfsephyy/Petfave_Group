<?php

namespace App\Services;

use App\Models\AuditEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class Audit
{
    public static function record(string $action, Model $subject, array $changes = []): void
    {
        AuditEvent::create([
            'actor_id' => Auth::id(), 'action' => $action,
            'subject_type' => class_basename($subject), 'subject_id' => (string) $subject->getKey(),
            'changes' => $changes ?: null,
        ]);
    }
}
