<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Merchandise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MerchandiseController extends Controller
{
    public function image(int $id)
    {
        $merchandise = Merchandise::findOrFail($id);
        $path = $merchandise->image_path;
        if (!$path || !Storage::disk('public')->exists($path)) {
            abort(404);
        }
        return Storage::disk('public')->response($path);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Merchandise::with('createdByUser:id,name');

        if ($request->boolean('available_only')) {
            $query->where('is_available', true);
        }

        $items = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'is_available' => 'boolean',
            'image' => 'nullable|file|image|max:2048',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('merchandise', 'public');
        }

        $merchandise = Merchandise::create([
            'name' => $request->input('name'),
            'description' => $request->input('description'),
            'price' => $request->input('price'),
            'is_available' => $request->boolean('is_available', true),
            'image_path' => $imagePath,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Merchandise created',
            'data' => $merchandise->load('createdByUser:id,name'),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $merchandise = Merchandise::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'is_available' => 'boolean',
            'image' => 'nullable|file|image|max:2048',
        ]);

        if ($request->has('name')) {
            $merchandise->name = $request->input('name');
        }
        if ($request->has('description')) {
            $merchandise->description = $request->input('description');
        }
        if ($request->has('price')) {
            $merchandise->price = $request->input('price');
        }
        if ($request->has('is_available')) {
            $merchandise->is_available = $request->boolean('is_available');
        }

        if ($request->hasFile('image')) {
            if ($merchandise->image_path && Storage::disk('public')->exists($merchandise->image_path)) {
                Storage::disk('public')->delete($merchandise->image_path);
            }
            $merchandise->image_path = $request->file('image')->store('merchandise', 'public');
        }

        $merchandise->save();

        return response()->json([
            'success' => true,
            'message' => 'Merchandise updated',
            'data' => $merchandise->load('createdByUser:id,name'),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $merchandise = Merchandise::findOrFail($id);
        $merchandise->delete();

        return response()->json(['success' => true, 'message' => 'Merchandise deleted']);
    }
}
