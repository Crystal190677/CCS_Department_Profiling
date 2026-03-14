<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    private const ROLES = ['ADMIN', 'FACULTY', 'OFFICER', 'STUDENT'];

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'identifier' => 'required|string', // email or student_number
            'password' => 'required|string',
            'role' => 'required|string|in:' . implode(',', self::ROLES),
        ]);

        $user = $this->findUser($request->identifier, $request->role);

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
            ], 401);
        }

        if ($user->role !== $request->role) {
            return response()->json([
                'success' => false,
                'message' => "Access denied. This account is registered as {$user->role}. Please select the correct role.",
            ], 403);
        }

        $token = $user->createToken('ccs-auth')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'token' => $token,
                'user' => $this->formatUser($user),
            ],
        ]);
    }

    public function signUp(Request $request): JsonResponse
    {
        $request->validate([
            'student_number' => 'required|string|unique:users,student_number',
            'name' => 'required|string|max:255',
            'password' => 'required|string|min:6|confirmed',
            'email' => 'nullable|email',
        ]);

        $user = User::create([
            'student_number' => $request->student_number,
            'name' => $request->name,
            'email' => $request->email ?? $request->student_number . '@ccs.edu',
            'password' => Hash::make($request->password),
            'role' => 'STUDENT',
        ]);

        $token = $user->createToken('ccs-auth')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registration successful',
            'data' => [
                'token' => $token,
                'user' => $this->formatUser($user),
            ],
        ], 201);
    }

    private function findUser(string $identifier, string $role): ?User
    {
        if ($role === 'STUDENT') {
            return User::where('student_number', $identifier)
                ->orWhere('email', $identifier)
                ->first();
        }

        return User::where('email', $identifier)->first();
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'email' => $user->email,
            'student_number' => $user->student_number,
            'name' => $user->name,
            'role' => $user->role,
        ];
    }
}
