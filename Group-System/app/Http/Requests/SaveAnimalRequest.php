<?php

namespace App\Http\Requests;

use App\Models\Animal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveAnimalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $animal = $this->route('animal');

        return $animal instanceof Animal ? $this->user()->can('update', $animal) : $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'guardian_id' => $this->user()->isStaff()
                ? ['required', Rule::exists('pf_guardians', 'id')->whereNull('archived_at')]
                : ['prohibited'],
            'name' => ['required', 'string', 'max:100'],
            'species_id' => ['required_without:custom_species', 'nullable', 'integer', 'exists:pf_species,id'],
            'custom_species' => ['required_without:species_id', 'nullable', 'string', 'max:80', 'prohibits:species_id,breed_id'],
            'breed_id' => ['nullable', 'integer', Rule::exists('pf_breeds', 'id')->where('species_id', $this->input('species_id'))],
            'custom_breed' => ['nullable', 'string', 'max:100', 'prohibits:breed_id'],
            'sex' => ['required', Rule::in(['male', 'female', 'unknown'])],
            'birth_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:'.now('Asia/Manila')->toDateString()],
            'microchip' => ['nullable', 'string', 'max:40', Rule::unique('pf_animals')->ignore($this->route('animal'))],
            'weight_kg' => ['nullable', 'numeric', 'min:0.01', 'max:99999'],
            'color' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
