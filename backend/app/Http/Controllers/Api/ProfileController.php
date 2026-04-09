<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    private const AVATAR_RULE = 'required|file|mimes:jpeg,jpg,png|max:2048';

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->fresh();

        return response()->json([
            'success' => true,
            'data' => $this->profilePayload($user),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        if (in_array($user->role, ['STUDENT', 'OFFICER'], true)) {
            $validated = $request->validate([
                'contact_number' => 'nullable|string|max:50',
            ]);
            $user->contact_number = $validated['contact_number'] ?? null;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Contact number updated. Name and email are managed on the official roster.',
                'data' => $this->profilePayload($user->fresh()),
            ]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'contact_number' => 'nullable|string|max:50',
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->contact_number = $validated['contact_number'] ?? null;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => $this->profilePayload($user->fresh()),
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => self::AVATAR_RULE,
        ]);

        $user = $request->user();

        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->avatar_path = $path;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile picture updated.',
            'data' => $this->profilePayload($user->fresh()),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->password = $request->input('password');
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
            'data' => $this->profilePayload($user->fresh()),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function profilePayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'contact_number' => $user->contact_number,
            'avatar_url' => $user->avatar_url,
            'student_number' => $user->student_number,
            'role' => $user->role,
            'is_sports_faculty' => (bool) ($user->is_sports_faculty ?? false),
            'profile_completion_percent' => $this->completionPercent($user),
        ];
    }

    private function completionPercent(User $user): int
    {
        $checks = [
            $user->avatar_path !== null && $user->avatar_path !== '',
            trim((string) $user->name) !== '',
            trim((string) $user->email) !== '',
            $user->contact_number !== null && trim((string) $user->contact_number) !== '',
        ];
        $filled = count(array_filter($checks));

        return (int) round($filled / count($checks) * 100);
    }
}
