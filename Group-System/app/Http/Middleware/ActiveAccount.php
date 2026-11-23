<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ActiveAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user?->disabled_at || ($user?->role === 'employee' && $request->session()->get('employee_session_version') !== $user->session_version)) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json(['message' => 'Your session has ended. Please sign in again or contact your administrator.', 'csrf_token' => csrf_token()], 401);
        }

        return $next($request);
    }
}
