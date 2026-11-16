<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicalEntry extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'pf_clinical_entries';

    protected $fillable = ['animal_id', 'encounter_id', 'author_id', 'kind', 'title', 'recorded_on', 'due_on', 'dosage', 'frequency', 'batch_number', 'findings', 'treatment', 'notes', 'voided_at', 'void_reason'];

    protected function casts(): array
    {
        return ['recorded_on' => 'date:Y-m-d', 'due_on' => 'date:Y-m-d', 'voided_at' => 'datetime'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id')->select('id', 'name');
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }
}
