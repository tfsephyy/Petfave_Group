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
        if ($request->user()?->disabled_at) {
            Auth::logout();
            $request->session()->invalidate();

            return response()->json(['message' => 'This account has been closed. Please contact your clinic.'], 401);
        }

        return $next($request);
    }
}
