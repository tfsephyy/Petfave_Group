<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;

class BookingPolicy
{
    public function view(User $user, Booking $booking): bool
    {
        return $user->isStaff() || $booking->animal->guardian->account_id === $user->id;
    }

    public function update(User $user, Booking $booking): bool
    {
        return $this->view($user, $booking);
    }
}
