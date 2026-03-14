<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminFacultyOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['ADMIN', 'FACULTY'])) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Admin or Faculty role required.',
            ], 403);
        }

        return $next($request);
    }
}
