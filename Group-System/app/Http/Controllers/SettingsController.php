<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class SettingsController extends Controller
{
    public function closeAccount(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'owner', 403);
        $request->validate(['current_password' => ['bail', 'required', 'string', 'max:128', 'current_password']]);
        $user = $request->user();
        DB::transaction(function () use ($user) {
            $user->forceFill(['disabled_at' => now(), 'remember_token' => Str::random(60)])->save();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            Audit::record('account.closed', $user);
        });
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Your portal account is closed. Clinic records are retained.', 'csrf_token' => csrf_token()]);
    }

    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'lowercase', 'max:254', Rule::unique('pf_accounts')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+().\s-]+$/'],
            'address' => ['nullable', 'string', 'max:500'],
            'current_password' => ['bail', $request->input('email') !== $user->email ? 'required' : 'nullable', 'string', 'max:128', 'current_password'],
            'role' => ['prohibited'], 'account_id' => ['prohibited'],
        ]);
        DB::transaction(function () use ($user, $data) {
            $user->update(collect($data)->only('name', 'email')->all());
            $user->guardian?->update(collect($data)->only('name', 'email', 'phone', 'address')->all());
            Audit::record('account.profile_updated', $user);
        });

        return response()->json(['user' => $user->fresh()->load('guardian')]);
    }

    public function password(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['bail', 'required', 'string', 'max:128', 'current_password'],
            'password' => ['required', 'confirmed', 'different:current_password', 'max:128', Password::min(12)->mixedCase()->numbers()],
        ]);
        DB::transaction(function () use ($request, $data) {
            $request->user()->forceFill(['password' => Hash::make($data['password']), 'remember_token' => Str::random(60)])->save();
            DB::table('sessions')->where('user_id', $request->user()->id)->where('id', '!=', $request->session()->getId())->delete();
            Audit::record('account.password_changed', $request->user());
        });
        $request->session()->regenerate();

        return response()->json(['message' => 'Password changed. Other sessions have been signed out.', 'csrf_token' => csrf_token()]);
    }
}
