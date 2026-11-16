<?php

namespace App\Policies;

use App\Models\Animal;
use App\Models\User;

class AnimalPolicy
{
    public function view(User $user, Animal $animal): bool
    {
        return $user->isStaff() || (! $animal->archived_at && $animal->guardian->account_id === $user->id);
    }

    public function update(User $user, Animal $animal): bool
    {
        return $this->view($user, $animal) && ! $animal->archived_at;
    }

    public function archive(User $user, Animal $animal): bool
    {
        return $user->isStaff();
    }

    public function clinical(User $user, Animal $animal): bool
    {
        return $user->isClinician() && ! $animal->archived_at;
    }
}
