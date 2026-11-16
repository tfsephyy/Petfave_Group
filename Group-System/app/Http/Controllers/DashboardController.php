<?php

namespace App\Http\Controllers;

use App\Models\Animal;
use App\Models\AuditEvent;
use App\Models\Booking;
use App\Models\ClinicalEntry;
use App\Models\Guardian;
use App\Models\StockProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $animals = Animal::visibleTo($user)->whereNull('archived_at');
        $bookings = Booking::visibleTo($user);
        $today = now('Asia/Manila')->startOfDay()->utc();
        $tomorrow = $today->copy()->addDay();
        $due = ClinicalEntry::whereNull('voided_at')->whereNotNull('due_on')->where('due_on', '<=', now('Asia/Manila')->addDays(30)->toDateString())
            ->whereHas('animal', fn ($q) => $q->visibleTo($user)->whereNull('archived_at'));
        $stats = [
            'animals' => (clone $animals)->count(),
            'upcoming' => (clone $bookings)->whereIn('status', ['pending', 'confirmed'])->where('starts_at', '>=', now())->count(),
            'today' => (clone $bookings)->where('starts_at', '>=', $today)->where('starts_at', '<', $tomorrow)->whereIn('status', ['pending', 'confirmed', 'completed'])->count(),
            'due' => (clone $due)->count(),
            'guardians' => $user->isStaff() ? Guardian::whereNull('archived_at')->count() : null,
            'low_stock' => $user->isStaff() ? StockProduct::whereNull('archived_at')->whereColumn('quantity', '<=', 'reorder_level')->count() : null,
        ];
        $series = [];
        for ($offset = 5; $offset >= 0; $offset--) {
            $localStart = now('Asia/Manila')->startOfMonth()->subMonths($offset);
            $end = $localStart->copy()->addMonth()->utc();
            $start = $localStart->copy()->utc();
            $series[] = [
                'label' => $start->copy()->timezone('Asia/Manila')->format('M Y'),
                'bookings' => (clone $bookings)->where('starts_at', '>=', $start)->where('starts_at', '<', $end)->count(),
                'completed' => (clone $bookings)->where('starts_at', '>=', $start)->where('starts_at', '<', $end)->where('status', 'completed')->count(),
            ];
        }

        return response()->json([
            'stats' => $stats, 'series' => $series,
            'upcoming' => (clone $bookings)->whereIn('status', ['pending', 'confirmed'])->where('ends_at', '>=', now())->with('animal.guardian:id,name', 'animal.species', 'resource:id,name')->orderBy('starts_at')->limit(5)->get(),
            'recent_animals' => (clone $animals)->with('guardian:id,name', 'species', 'breed')->latest()->limit(4)->get(),
            'due_records' => (clone $due)->with('animal:id,name')->orderBy('due_on')->limit(6)->get(),
            'low_stock' => $user->isStaff() ? StockProduct::whereNull('archived_at')->whereColumn('quantity', '<=', 'reorder_level')->orderBy('quantity')->limit(5)->get() : [],
        ]);
    }

    public function audit(Request $request): JsonResponse
    {
        return response()->json($this->listing($request, AuditEvent::with('actor'), ['created_at', 'action']));
    }
}
