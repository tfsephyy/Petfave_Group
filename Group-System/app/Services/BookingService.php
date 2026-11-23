<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function save(array $data, User $actor, ?Booking $booking = null): Booking
    {
        app(BookingSchedule::class)->validate($data['starts_at'], $data['ends_at']);
        $resources = isset($data['resource_id'])
            ? array_unique(array_filter([$data['resource_id'], $booking?->resource_id]))
            : BookingResource::orderBy('id')->pluck('id')->all();
        sort($resources);

        return DB::transaction(function () use ($data, $actor, $booking, $resources) {
            foreach ($resources as $id) {
                BookingResource::whereKey($id)->increment('lock_version');
            }
            if ($booking) {
                $booking = Booking::lockForUpdate()->findOrFail($booking->id);
                if (! in_array($booking->status, ['pending', 'confirmed'], true) || $booking->starts_at->isPast()) {
                    throw ValidationException::withMessages(['starts_at' => 'Only upcoming, active bookings can be rescheduled.']);
                }
                if ($booking->animal_id !== $data['animal_id']) {
                    throw ValidationException::withMessages(['animal_id' => 'A booking cannot be transferred to another pet. Cancel it and create a new booking.']);
                }
            }
            $data['starts_at'] = Carbon::parse($data['starts_at'])->utc();
            $data['ends_at'] = Carbon::parse($data['ends_at'])->utc();
            $candidates = isset($data['resource_id']) ? [$data['resource_id']] : $resources;
            if ($booking && ! isset($data['resource_id'])) {
                $candidates = array_unique([$booking->resource_id, ...$candidates]);
            }
            $resourceId = null;
            foreach ($candidates as $candidate) {
                $conflict = Booking::where('resource_id', $candidate)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->when($booking, fn ($q) => $q->whereKeyNot($booking->id))
                    ->where('starts_at', '<', $data['ends_at'])->where('ends_at', '>', $data['starts_at'])->exists();
                if (! $conflict) {
                    $resourceId = $candidate;
                    break;
                }
            }
            if ($resourceId === null) {
                throw ValidationException::withMessages(['starts_at' => 'That time is no longer available. Please choose another appointment time.']);
            }
            $data['resource_id'] = $resourceId;
            $data['status'] = $booking && $actor->isStaff() ? $booking->status : 'pending';
            if ($booking) {
                $before = $booking->only(array_keys($data));
                $booking->update($data);
                Audit::record('booking.rescheduled', $booking, ['before' => $before, 'after' => $data]);
            } else {
                $booking = Booking::create($data + ['created_by' => $actor->id]);
                Audit::record('booking.requested', $booking);
            }

            return $booking;
        }, 3);
    }

    public function transition(Booking $booking, string $status, User $actor, ?string $reason): Booking
    {
        return DB::transaction(function () use ($booking, $status, $actor, $reason) {
            BookingResource::whereKey($booking->resource_id)->increment('lock_version');
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            $allowed = [
                'pending' => ['confirmed', 'cancelled', 'rejected'],
                'confirmed' => ['completed', 'cancelled', 'no_show'],
            ];
            if (! in_array($status, $allowed[$booking->status] ?? [], true)) {
                throw ValidationException::withMessages(['status' => 'This status change is no longer available.']);
            }
            if (! $actor->isStaff() && ($status !== 'cancelled' || $booking->starts_at->isPast())) {
                abort(403);
            }
            if (in_array($status, ['completed', 'no_show'], true) && $booking->starts_at->isFuture()) {
                throw ValidationException::withMessages(['status' => 'The visit has not started yet.']);
            }
            $before = $booking->status;
            $booking->update(['status' => $status, 'cancellation_reason' => $reason, 'completed_at' => $status === 'completed' ? now() : null]);
            Audit::record('booking.status_changed', $booking, ['before' => $before, 'after' => $status, 'reason' => $reason]);

            return $booking;
        }, 3);
    }
}
