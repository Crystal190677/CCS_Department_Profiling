<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacultyAccountsController extends Controller
{
    /**
     * Admin only: create a Faculty account (no self-registration).
     */
    public function store(Request $request): JsonResponse
    {
        $auth = $request->user();
        if (!$auth || $auth->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only an administrator can create faculty accounts'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'is_sports_faculty' => 'boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'student_number' => null,
            'password' => $validated['password'],
            'password_set_at' => now(),
            'role' => 'FACULTY',
            'is_sports_faculty' => $request->boolean('is_sports_faculty'),
        ]);

        AuditLogger::log(
            'created',
            'Faculty account: '.$user->name.' ('.$user->email.')',
            $auth
        );

        return response()->json([
            'success' => true,
            'message' => 'Faculty account created. Share credentials securely with the faculty member.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_sports_faculty' => (bool) $user->is_sports_faculty,
            ],
        ], 201);
    }
}
