<?php
require_once __DIR__ . '/db_helper.php';

$purchase_orders = read_json_file('purchase_orders.json');

$totalCount = count($purchase_orders);
$draftCount = 0;
$pendingCount = 0;
$completedCount = 0;

foreach ($purchase_orders as $po) {
    $status = isset($po['status']) ? strtolower(trim($po['status'])) : '';
    if ($status === 'draft') {
        $draftCount++;
    } elseif ($status === 'pending' || $status === 'submitted') {
        $pendingCount++;
    } elseif ($status === 'completed') {
        $completedCount++;
    }
}

json_response(true, [
    'total_pos' => $totalCount,
    'draft_pos' => $draftCount,
    'pending_pos' => $pendingCount,
    'completed_pos' => $completedCount
]);
