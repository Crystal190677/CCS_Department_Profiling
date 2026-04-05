<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Merchandise;
use App\Models\MerchandiseOrder;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MerchandiseOrdersController extends Controller
{
    public const PAYMENT_PAID_ONLINE = 'paid_online';
    public const PAYMENT_PAID_CASH = 'paid_cash';

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        if (in_array($user->role, ['ADMIN', 'OFFICER'], true)) {
            $query = MerchandiseOrder::with(['user:id,name,email,student_number', 'merchandise', 'confirmedByUser:id,name']);
            if ($request->filled('merchandise_id')) {
                $query->where('merchandise_id', $request->input('merchandise_id'));
            }
            if ($request->filled('payment_status')) {
                $query->where('payment_status', $request->input('payment_status'));
            }
            $orders = $query->latest()->paginate((int) $request->input('per_page', 15));
        } else {
            $orders = MerchandiseOrder::with('merchandise')
                ->where('user_id', $user->id)
                ->latest()
                ->paginate((int) $request->input('per_page', 15));
        }

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'merchandise_id' => 'required|exists:merchandise,id',
            'quantity' => 'required|integer|min:1',
            'proof_image' => 'nullable|image|max:5120',
            'payer_full_name' => 'nullable|string|max:255',
            'section' => 'nullable|string|max:120',
            'course' => 'nullable|string|max:120',
            'gcash_reference' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value === null || $value === '') {
                        return;
                    }
                    if (! preg_match('/^[0-9]{13}$/', (string) $value)) {
                        $fail('The gcash reference must be exactly 13 digits.');
                    }
                },
            ],
        ]);

        $merchandise = Merchandise::findOrFail($request->input('merchandise_id'));
        if (!$merchandise->is_available) {
            return response()->json(['success' => false, 'message' => 'This item is not available'], 400);
        }

        $quantity = (int) $request->input('quantity');
        $amount = $merchandise->price * $quantity;
        $proofPath = null;

        if ($request->hasFile('proof_image')) {
            $proofPath = $request->file('proof_image')->store('proofs', 'public');
        }

        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $gcashRef = $request->input('gcash_reference');
        $hasCheckoutMeta = $request->filled('payer_full_name')
            || $request->filled('section')
            || $request->filled('course')
            || $request->filled('gcash_reference');

        $order = MerchandiseOrder::create([
            'user_id' => $authUser->id,
            'merchandise_id' => $merchandise->id,
            'quantity' => $quantity,
            'amount' => $amount,
            'payer_full_name' => $request->input('payer_full_name'),
            'section' => $request->input('section'),
            'course' => $request->input('course'),
            'gcash_reference' => $gcashRef ?: null,
            'payment_status' => MerchandiseOrder::PAYMENT_STATUS_PENDING,
            'proof_image_path' => $proofPath,
            'submitted_at' => ($proofPath || $hasCheckoutMeta) ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order placed. An officer will confirm payment status.',
            'data' => $order->load('merchandise'),
        ], 201);
    }

    public function updatePaymentStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'payment_status' => 'required|in:paid_online,paid_cash',
        ]);

        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $order = MerchandiseOrder::with(['user', 'merchandise'])->findOrFail($id);

        $order->payment_status = $request->input('payment_status');
        $order->confirmed_by = $authUser->id;
        $order->confirmed_at = now();
        $order->save();

        $merchandiseName = $order->merchandise?->name ?? 'your order';
        $statusLabel = $request->input('payment_status') === self::PAYMENT_PAID_ONLINE ? 'Paid Online' : 'Paid (Cash)';

        UserNotification::create([
            'user_id' => $order->user_id,
            'type' => 'merchandise',
            'title' => 'Payment confirmed',
            'message' => "Your order for {$merchandiseName} has been marked as {$statusLabel}.",
            'data' => ['order_id' => $order->id],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment status updated',
            'data' => $order->load(['merchandise', 'confirmedByUser:id,name']),
        ]);
    }
}
