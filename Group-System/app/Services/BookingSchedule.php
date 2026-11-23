<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingResource;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class BookingSchedule
{
    public const TIMEZONE = 'Asia/Manila';

    public const SLOT_MINUTES = 15;

    private const WINDOWS = [['08:00', '12:00'], ['13:00', '16:30']];

    /** @return array<int, array{starts_at: string, ends_at: string}> */
    public function slots(string $date): array
    {
        $day = CarbonImmutable::parse($date, self::TIMEZONE)->startOfDay();
        if ($day->isSunday() || $day->isBefore(CarbonImmutable::now(self::TIMEZONE)->startOfDay())) {
            return [];
        }

        $slots = [];
        foreach (self::WINDOWS as [$opening, $closing]) {
            $end = $day->setTimeFromTimeString($closing);
            for ($start = $day->setTimeFromTimeString($opening); $start->addMinutes(self::SLOT_MINUTES)->lte($end); $start = $start->addMinutes(self::SLOT_MINUTES)) {
                if ($start->isFuture()) {
                    $slots[] = ['starts_at' => $start->toIso8601String(), 'ends_at' => $start->addMinutes(self::SLOT_MINUTES)->toIso8601String()];
                }
            }
        }

        return $slots;
    }

    public function validate(string $startsAt, string $endsAt): void
    {
        $start = CarbonImmutable::parse($startsAt)->setTimezone(self::TIMEZONE);
        $end = CarbonImmutable::parse($endsAt)->setTimezone(self::TIMEZONE);
        foreach ($this->slots($start->toDateString()) as $slot) {
            if ($start->equalTo($slot['starts_at']) && $end->equalTo($slot['ends_at'])) {
                return;
            }
        }

        throw ValidationException::withMessages(['starts_at' => 'Choose an available 15-minute appointment, Monday to Saturday, from 8 AM to noon or 1 PM to 4:30 PM.']);
    }

    /** @return array<int, array{starts_at: string, ends_at: string}> */
    public function availableSlots(string $date, ?Booking $booking = null): array
    {
        $slots = $this->slots($date);
        $resources = BookingResource::orderBy('id')->pluck('id');
        if ($slots === [] || $resources->isEmpty()) {
            return [];
        }

        $day = CarbonImmutable::parse($date, self::TIMEZONE)->startOfDay();
        $reserved = Booking::whereIn('status', ['pending', 'confirmed'])
            ->when($booking, fn ($query) => $query->whereKeyNot($booking->id))
            ->where('starts_at', '<', $day->addDay()->utc())->where('ends_at', '>', $day->utc())
            ->get(['resource_id', 'starts_at', 'ends_at'])->groupBy('resource_id');

        return array_values(array_filter($slots, function (array $slot) use ($resources, $reserved): bool {
            foreach ($resources as $resource) {
                $conflict = $reserved->get($resource, collect())->contains(fn (Booking $item) => $item->starts_at->lt($slot['ends_at']) && $item->ends_at->gt($slot['starts_at']));
                if (! $conflict) {
                    return true;
                }
            }

            return false;
        }));
    }
}
