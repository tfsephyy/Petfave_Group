<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AccountAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $passwordOrLogout = ($request->is('api/settings/password') && $request->isMethod('PUT'))
            || ($request->is('api/logout') && $request->isMethod('POST'));
        if ($request->user()->must_change_password && ! $passwordOrLogout) {
            return response()->json(['message' => 'Choose your own password before continuing.', 'code' => 'password_change_required'], 423);
        }

        return $next($request);
    }
}
