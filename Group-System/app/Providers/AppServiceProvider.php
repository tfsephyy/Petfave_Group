<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Gate::define('staff', fn (User $user) => $user->isStaff());
        Gate::define('admin', fn (User $user) => $user->role === 'admin');
        RateLimiter::for('login', function (Request $request): array {
            $email = $request->input('email');
            $key = is_string($email) ? Str::lower(Str::limit($email, 254, '')) : 'invalid';

            return [
                Limit::perMinute(5)->by($key.'|'.$request->ip()),
                Limit::perMinute(25)->by($request->ip()),
            ];
        });
        RateLimiter::for('public-auth', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('clinic', fn (Request $request) => Limit::perMinute(180)->by($request->user()?->id ?: $request->ip()));
        ResetPassword::createUrlUsing(fn (object $user, string $token) => rtrim(config('app.frontend_url'), '/').'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email]));
    }
}
