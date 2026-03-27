<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || $user->role !== 'ADMIN') {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Administrator role required.',
            ], 403);
        }

        return $next($request);
    }
}
