<?php

namespace App\Http\Requests;

use App\Models\Booking;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $booking = $this->route('booking');

        return $booking instanceof Booking ? $this->user()->can('update', $booking) : $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'animal_id' => ['required', 'ulid', 'exists:pf_animals,id'],
            'resource_id' => ['required', 'ulid', 'exists:pf_booking_resources,id'],
            'service' => ['required', Rule::in(['Consultation', 'Vaccination', 'Wellness exam', 'Surgery', 'Dental care', 'Follow-up', 'Grooming'])],
            'starts_at' => ['required', 'date', 'after:now', 'regex:/T.*(Z|[+-]\d{2}:\d{2})$/'],
            'ends_at' => ['required', 'date', 'after:starts_at', 'regex:/T.*(Z|[+-]\d{2}:\d{2})$/'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'status' => ['prohibited'], 'created_by' => ['prohibited'], 'guardian_id' => ['prohibited'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if (! $validator->errors()->has('starts_at') && ! $validator->errors()->has('ends_at')) {
                if ($this->date('starts_at')->diffInMinutes($this->date('ends_at')) > 240) {
                    $validator->errors()->add('ends_at', 'A booking may last at most four hours.');
                }
            }
        }];
    }
}
