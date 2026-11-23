<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveBookingRequest;
use App\Models\Animal;
use App\Models\Booking;
use App\Services\BookingSchedule;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after:from'],
            'status' => ['nullable', Rule::in(['pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'no_show'])],
        ]);
        $query = Booking::visibleTo($request->user())->with(['animal.guardian:id,name', 'animal.species', 'resource:id,name']);
        $query->when($request->filled('from'), fn ($q) => $q->where('starts_at', '>=', $request->date('from')->utc()));
        $query->when($request->filled('to'), fn ($q) => $q->where('starts_at', '<', $request->date('to')->utc()));
        $query->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')));

        return response()->json($this->listing($request, $query, ['starts_at', 'created_at', 'status'], 'starts_at'));
    }

    public function availability(Request $request, BookingSchedule $schedule): JsonResponse
    {
        if ($request->has('date')) {
            $data = $request->validate([
                'date' => ['required', 'date_format:Y-m-d'],
                'booking_id' => ['nullable', 'ulid', 'exists:pf_bookings,id'],
            ]);
            $booking = isset($data['booking_id']) ? Booking::findOrFail($data['booking_id']) : null;
            if ($booking) {
                $this->authorize('update', $booking);
            }

            return response()->json(['data' => $schedule->availableSlots($data['date'], $booking)]);
        }

        $data = $request->validate([
            'from' => ['required', 'date'], 'to' => ['required', 'date', 'after:from', 'before_or_equal:'.now()->addYear()->toIso8601String()],
            'resource_id' => ['required', 'ulid', 'exists:pf_booking_resources,id'],
        ]);
        $from = $request->date('from')->utc();
        $to = $request->date('to')->utc();
        abort_if($from->diffInDays($to) > 62, 422, 'Choose a range of at most 62 days.');

        return response()->json(['data' => Booking::where('resource_id', $data['resource_id'])->whereIn('status', ['pending', 'confirmed'])
            ->where('starts_at', '<', $to)->where('ends_at', '>', $from)->get(['starts_at', 'ends_at'])]);
    }

    public function store(SaveBookingRequest $request, BookingService $service): JsonResponse
    {
        $animal = Animal::findOrFail($request->validated('animal_id'));
        $this->authorize('update', $animal);

        return response()->json($service->save($request->validated(), $request->user()), 201);
    }

    public function update(SaveBookingRequest $request, Booking $booking, BookingService $service): JsonResponse
    {
        $animal = Animal::findOrFail($request->validated('animal_id'));
        $this->authorize('update', $animal);

        return response()->json($service->save($request->validated(), $request->user(), $booking));
    }

    public function status(Request $request, Booking $booking, BookingService $service): JsonResponse
    {
        $this->authorize('update', $booking);
        $data = $request->validate([
            'status' => ['required', Rule::in(['confirmed', 'completed', 'cancelled', 'rejected', 'no_show'])],
            'reason' => ['nullable', 'string', 'max:500', 'required_if:status,cancelled,rejected,no_show'],
        ]);

        return response()->json($service->transition($booking, $data['status'], $request->user(), $data['reason'] ?? null));
    }
}
