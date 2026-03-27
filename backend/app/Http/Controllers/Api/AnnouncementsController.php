<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AnnouncementsController extends Controller
{
    private const IMAGE_RULE = 'nullable|file|mimes:jpeg,jpg,png|max:5120';

    public function index(Request $request): JsonResponse
    {
        $items = Announcement::query()
            ->with('author:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'tag' => 'nullable|string|max:32|in:general,event,urgent',
            'image' => self::IMAGE_RULE,
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('announcements', 'public');
        }

        $announcement = Announcement::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'content' => $validated['content'],
            'tag' => $validated['tag'] ?? 'general',
            'image_path' => $imagePath,
        ]);

        AuditLogger::log(
            'created',
            'Announcement: '.$announcement->title,
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Announcement posted',
            'data' => $announcement->load('author:id,name'),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $announcement = Announcement::findOrFail($id);

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'tag' => 'sometimes|nullable|string|max:32|in:general,event,urgent',
            'image' => self::IMAGE_RULE,
            'remove_image' => 'sometimes|boolean',
        ]);

        if ($request->has('title')) {
            $announcement->title = $request->input('title');
        }
        if ($request->has('content')) {
            $announcement->content = $request->input('content');
        }
        if ($request->has('tag')) {
            $announcement->tag = $request->input('tag') ?: 'general';
        }

        if ($request->boolean('remove_image')) {
            if ($announcement->image_path && Storage::disk('public')->exists($announcement->image_path)) {
                Storage::disk('public')->delete($announcement->image_path);
            }
            $announcement->image_path = null;
        }

        if ($request->hasFile('image')) {
            if ($announcement->image_path && Storage::disk('public')->exists($announcement->image_path)) {
                Storage::disk('public')->delete($announcement->image_path);
            }
            $announcement->image_path = $request->file('image')->store('announcements', 'public');
        }

        $announcement->save();

        return response()->json([
            'success' => true,
            'message' => 'Announcement updated',
            'data' => $announcement->fresh()->load('author:id,name'),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $announcement = Announcement::findOrFail($id);
        $title = $announcement->title;

        if ($announcement->image_path && Storage::disk('public')->exists($announcement->image_path)) {
            Storage::disk('public')->delete($announcement->image_path);
        }

        $announcement->delete();

        AuditLogger::log('deleted', 'Announcement: '.$title, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Announcement removed',
        ]);
    }
}
