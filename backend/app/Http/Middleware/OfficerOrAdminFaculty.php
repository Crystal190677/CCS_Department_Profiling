<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class OfficerOrAdminFaculty
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['ADMIN', 'FACULTY', 'OFFICER'])) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Admin, Faculty, or Officer role required.',
            ], 403);
        }

        return $next($request);
    }
}
