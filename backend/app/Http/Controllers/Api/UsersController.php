<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsersController extends Controller
{
    /**
     * Admin-only: update a user (e.g. set is_sports_faculty for PE/sports coordinators).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        if ($request->has('is_sports_faculty')) {
            $user->is_sports_faculty = (bool) $request->boolean('is_sports_faculty');
            $user->save();
        }

        return response()->json([
            'success' => true,
            'data' => $user->fresh(),
        ]);
    }
}
