<?php

namespace App\Http\Controllers;

use App\Models\Guardian;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function session(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user?->disabled_at || ($user?->role === 'employee' && $request->session()->get('employee_session_version') !== $user->session_version)) {
            return $this->logout($request);
        }

        return response()->json(['user' => $request->user()?->load('guardian'), 'csrf_token' => csrf_token()]);
    }

    public function register(Request $request): JsonResponse
    {
        $values = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'lowercase', 'max:254', 'unique:pf_accounts,email'],
            'password' => ['required', 'confirmed', 'max:128', PasswordRule::min(12)->mixedCase()->numbers()],
            'role' => ['prohibited'], 'account_id' => ['prohibited'],
        ]);
        $user = DB::transaction(function () use ($values) {
            $user = User::create(collect($values)->only('name', 'email', 'password')->all());
            Guardian::create(['account_id' => $user->id, 'name' => $user->name, 'email' => $user->email]);
            Audit::record('account.registered', $user);

            return $user;
        });
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => $user->load('guardian'), 'csrf_token' => csrf_token()], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $values = $request->validate(['email' => ['required', 'email', 'max:254'], 'password' => ['required', 'string', 'max:128']]);
        $values['email'] = Str::lower($values['email']);
        if (! Auth::attempt($values + ['disabled_at' => null])) {
            throw ValidationException::withMessages(['email' => 'The email or password is incorrect.']);
        }
        $request->session()->regenerate();
        Audit::record('account.signed_in', $request->user());
        if ($request->user()->role === 'employee') {
            $request->session()->put('employee_session_version', $request->user()->session_version);
        }

        return $this->session($request);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['user' => null, 'csrf_token' => csrf_token()]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email', 'max:254']]);
        Password::sendResetLink($request->only('email'));

        return response()->json(['message' => 'If that account exists, a password reset link has been sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'], 'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', 'max:128', PasswordRule::min(12)->mixedCase()->numbers()],
        ]);
        $status = Password::reset($request->only('email', 'password', 'password_confirmation', 'token'), function (User $user, string $password) {
            DB::transaction(function () use ($user, $password) {
                $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60), 'must_change_password' => false, 'session_version' => $user->session_version + 1])->save();
                DB::table('sessions')->where('user_id', $user->id)->delete();
                Audit::record('account.password_reset', $user);
            });
            event(new PasswordReset($user));
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return response()->json(['message' => 'Your password has been reset.']);
    }
}
