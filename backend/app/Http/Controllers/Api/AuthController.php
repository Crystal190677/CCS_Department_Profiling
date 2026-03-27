<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
            'identifier' => 'required|string',
            'password' => 'required|string',
            'role' => 'required|string|in:' . implode(',', self::ROLES),
        ]);

        $user = $this->findUser($request->input('identifier'), $request->input('role'));

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
            ], 401);
        }

        if ($user->role !== $request->input('role')) {
            return response()->json([
                'success' => false,
                'message' => "Access denied. This account is registered as {$user->role}. Please select the correct role.",
            ], 403);
        }

        if (in_array($user->role, ['STUDENT', 'OFFICER'], true) && !$user->hasPasswordClaimed()) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is not activated yet. Use “Claim your account” on the login page to set a password first.',
                'code' => 'CLAIM_REQUIRED',
            ], 403);
        }

        if (!Hash::check($request->input('password'), $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
            ], 401);
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

    /**
     * Step 1 — Check student number exists and account can be claimed (pre-provisioned by admin).
     */
    public function claimLookup(Request $request): JsonResponse
    {
        $request->validate([
            'student_number' => 'required|string|max:50',
        ]);

        $sn = trim($request->input('student_number'));

        $user = User::query()
            ->whereIn('role', ['STUDENT', 'OFFICER'])
            ->where('student_number', $sn)
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No pre-enrolled account found for this student number. Contact the department if you believe this is an error.',
            ], 404);
        }

        if ($user->hasPasswordClaimed()) {
            return response()->json([
                'success' => false,
                'message' => 'This account is already activated. Sign in with your student number and password.',
                'code' => 'ALREADY_CLAIMED',
            ], 409);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'student_number' => $user->student_number,
                'name' => $user->name,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * Step 2 — Set password for a pre-provisioned student or officer account.
     */
    public function claimAccount(Request $request): JsonResponse
    {
        $request->validate([
            'student_number' => 'required|string|max:50',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $sn = trim($request->input('student_number'));

        $user = User::query()
            ->whereIn('role', ['STUDENT', 'OFFICER'])
            ->where('student_number', $sn)
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found.',
            ], 404);
        }

        if ($user->hasPasswordClaimed()) {
            return response()->json([
                'success' => false,
                'message' => 'This account is already activated. Sign in instead.',
            ], 409);
        }

        $user->password = $request->input('password');
        $user->password_set_at = now();
        $user->save();

        $token = $user->createToken('ccs-auth')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Account activated',
            'data' => [
                'token' => $token,
                'user' => $this->formatUser($user),
            ],
        ], 201);
    }

    private function findUser(string $identifier, string $role): ?User
    {
        if (in_array($role, ['STUDENT', 'OFFICER'], true)) {
            return User::query()
                ->where('role', $role)
                ->where('student_number', $identifier)
                ->first();
        }

        return User::where('email', $identifier)->first();
    }

    private function formatUser(User $user): array
    {
        $user->refresh();

        return [
            'id' => $user->id,
            'email' => $user->email,
            'student_number' => $user->student_number,
            'name' => $user->name,
            'role' => $user->role,
            'is_sports_faculty' => (bool) ($user->is_sports_faculty ?? false),
            'contact_number' => $user->contact_number,
            'avatar_url' => $user->avatar_url,
        ];
    }
}
