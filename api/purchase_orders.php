<?php
require_once __DIR__ . '/db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$purchase_orders = read_json_file('purchase_orders.json');

function validate_purchase_order_payload($data, $requireItems = true) {
    if (empty($data['supplier_id'])) {
        json_response(false, null, 'Supplier selection is required', 400);
    }
    if (empty($data['po_date'])) {
        json_response(false, null, 'PO Date is required', 400);
    }
    if ($requireItems && (empty($data['items']) || !is_array($data['items']) || count($data['items']) === 0)) {
        json_response(false, null, 'At least one item row is required in Purchase Order', 400);
    }
    if (isset($data['status']) && !is_valid_status($data['status'], ['Draft', 'Pending', 'Completed'])) {
        json_response(false, null, 'Purchase order status is invalid', 400);
    }
    if (isset($data['additional_charges']) && !is_non_negative_number($data['additional_charges'])) {
        json_response(false, null, 'Additional charges must be zero or greater', 400);
    }
    if (!empty($data['items'])) {
        foreach ($data['items'] as $index => $itemRow) {
            if (empty($itemRow['item_id']) || empty($itemRow['item_code']) || empty($itemRow['item_name'])) {
                json_response(false, null, 'Item row #' . ($index + 1) . ' must reference an item from Item Master', 400);
            }
            if (!isset($itemRow['quantity']) || floatval($itemRow['quantity']) <= 0) {
                json_response(false, null, 'Item row #' . ($index + 1) . ' quantity must be greater than 0', 400);
            }
            if (!isset($itemRow['unit_price']) || !is_non_negative_number($itemRow['unit_price'])) {
                json_response(false, null, 'Item row #' . ($index + 1) . ' unit price must be zero or greater', 400);
            }
            if (isset($itemRow['discount']) && !is_non_negative_number($itemRow['discount'])) {
                json_response(false, null, 'Item row #' . ($index + 1) . ' discount must be zero or greater', 400);
            }
            if (isset($itemRow['tax']) && (!is_non_negative_number($itemRow['tax']) || floatval($itemRow['tax']) > 100)) {
                json_response(false, null, 'Item row #' . ($index + 1) . ' tax must be between 0 and 100', 400);
            }
        }
    }
}

if ($method === 'GET') {
    if (isset($_GET['action']) && $_GET['action'] === 'next_po_number') {
        json_response(true, [
            'po_number' => generate_next_po_number($purchase_orders)
        ]);
    }
    
    if (isset($_GET['id'])) {
        $id = $_GET['id'];
        foreach ($purchase_orders as $po) {
            if ($po['id'] == $id || $po['po_number'] == $id) {
                json_response(true, $po);
            }
        }
        json_response(false, null, 'Purchase order not found', 404);
    }
    
    $search = isset($_GET['search']) ? trim(strtolower($_GET['search'])) : '';
    $statusFilter = isset($_GET['status']) ? trim($_GET['status']) : '';
    
    $filtered = $purchase_orders;
    
    if ($statusFilter !== '') {
        $filtered = array_values(array_filter($filtered, function($po) use ($statusFilter) {
            return strcasecmp($po['status'], $statusFilter) === 0;
        }));
    }
    
    if ($search !== '') {
        $filtered = array_values(array_filter($filtered, function($po) use ($search) {
            return strpos(strtolower($po['po_number']), $search) !== false ||
                   strpos(strtolower($po['supplier_name']), $search) !== false ||
                   strpos(strtolower($po['created_by']), $search) !== false ||
                   strpos(strtolower($po['reference_number']), $search) !== false;
        }));
    }
    
    json_response(true, array_reverse($filtered));
}

if ($method === 'POST') {
    $data = parse_request_body();
    validate_purchase_order_payload($data);

    $maxIntegerId = 0;
    foreach ($purchase_orders as $po) {
        if (isset($po['id']) && $po['id'] > $maxIntegerId) {
            $maxIntegerId = $po['id'];
        }
    }

    $status = isset($data['status']) && in_array($data['status'], ['Draft', 'Pending', 'Completed']) 
        ? $data['status'] 
        : 'Draft';

    $poNumber = generate_next_po_number($purchase_orders);

    // Calculate line totals and summary totals on backend for data integrity
    $processedItems = [];
    $subtotal = 0;
    $totalDiscount = 0;
    $totalTax = 0;

    foreach ($data['items'] as $row) {
        $qty = floatval($row['quantity']);
        $unitPrice = floatval($row['unit_price']);
        $discount = isset($row['discount']) ? floatval($row['discount']) : 0;
        $taxPct = isset($row['tax']) ? floatval($row['tax']) : 0;

        $rawAmount = $qty * $unitPrice;
        $afterDiscount = max(0, $rawAmount - $discount);
        $taxAmount = ($afterDiscount * $taxPct) / 100;
        $lineTotal = round($afterDiscount + $taxAmount, 2);

        $subtotal += $rawAmount;
        $totalDiscount += $discount;
        $totalTax += $taxAmount;

        $processedItems[] = [
            'item_id' => isset($row['item_id']) ? $row['item_id'] : null,
            'item_code' => isset($row['item_code']) ? $row['item_code'] : '',
            'item_name' => isset($row['item_name']) ? $row['item_name'] : '',
            'description' => isset($row['description']) ? $row['description'] : '',
            'quantity' => $qty,
            'unit' => isset($row['unit']) ? $row['unit'] : 'Pcs',
            'unit_price' => $unitPrice,
            'discount' => $discount,
            'tax' => $taxPct,
            'line_total' => $lineTotal
        ];
    }

    $additionalCharges = isset($data['additional_charges']) ? floatval($data['additional_charges']) : 0;
    $grandTotal = round(($subtotal - $totalDiscount) + $totalTax + $additionalCharges, 2);

    $newPO = [
        'id' => $maxIntegerId + 1,
        'po_number' => $poNumber,
        'po_date' => trim($data['po_date']),
        'supplier_id' => $data['supplier_id'],
        'supplier_name' => isset($data['supplier_name']) ? trim($data['supplier_name']) : 'Unknown Supplier',
        'expected_delivery_date' => isset($data['expected_delivery_date']) ? trim($data['expected_delivery_date']) : '',
        'reference_number' => isset($data['reference_number']) ? trim($data['reference_number']) : '',
        'payment_terms' => isset($data['payment_terms']) ? trim($data['payment_terms']) : '30 Days',
        'delivery_location' => isset($data['delivery_location']) ? trim($data['delivery_location']) : '',
        'created_by' => isset($data['created_by']) && trim($data['created_by']) !== '' ? trim($data['created_by']) : 'System User',
        'notes' => isset($data['notes']) ? trim($data['notes']) : '',
        'status' => $status,
        'items' => $processedItems,
        'subtotal' => round($subtotal, 2),
        'total_discount' => round($totalDiscount, 2),
        'total_tax' => round($totalTax, 2),
        'additional_charges' => round($additionalCharges, 2),
        'grand_total' => $grandTotal,
        'created_at' => date('Y-m-d H:i:s')
    ];

    $purchase_orders[] = $newPO;
    write_json_file('purchase_orders.json', $purchase_orders);
    json_response(true, $newPO, 'Purchase Order saved as ' . $status);
}

if ($method === 'PUT') {
    $data = parse_request_body();
    if (empty($data['id'])) {
        json_response(false, null, 'Purchase Order ID is required', 400);
    }
    validate_purchase_order_payload($data, isset($data['items']));

    $found = false;
    foreach ($purchase_orders as &$po) {
        if ($po['id'] == $data['id']) {
            if (isset($data['po_date'])) $po['po_date'] = trim($data['po_date']);
            if (isset($data['supplier_id'])) $po['supplier_id'] = $data['supplier_id'];
            if (isset($data['supplier_name'])) $po['supplier_name'] = trim($data['supplier_name']);
            if (isset($data['expected_delivery_date'])) $po['expected_delivery_date'] = trim($data['expected_delivery_date']);
            if (isset($data['reference_number'])) $po['reference_number'] = trim($data['reference_number']);
            if (isset($data['payment_terms'])) $po['payment_terms'] = trim($data['payment_terms']);
            if (isset($data['delivery_location'])) $po['delivery_location'] = trim($data['delivery_location']);
            if (isset($data['created_by'])) $po['created_by'] = trim($data['created_by']);
            if (isset($data['notes'])) $po['notes'] = trim($data['notes']);
            if (isset($data['status'])) $po['status'] = trim($data['status']);

            if (isset($data['items']) && is_array($data['items'])) {
                $processedItems = [];
                $subtotal = 0;
                $totalDiscount = 0;
                $totalTax = 0;

                foreach ($data['items'] as $row) {
                    $qty = floatval($row['quantity']);
                    $unitPrice = floatval($row['unit_price']);
                    $discount = isset($row['discount']) ? floatval($row['discount']) : 0;
                    $taxPct = isset($row['tax']) ? floatval($row['tax']) : 0;

                    $rawAmount = $qty * $unitPrice;
                    $afterDiscount = max(0, $rawAmount - $discount);
                    $taxAmount = ($afterDiscount * $taxPct) / 100;
                    $lineTotal = round($afterDiscount + $taxAmount, 2);

                    $subtotal += $rawAmount;
                    $totalDiscount += $discount;
                    $totalTax += $taxAmount;

                    $processedItems[] = [
                        'item_id' => isset($row['item_id']) ? $row['item_id'] : null,
                        'item_code' => isset($row['item_code']) ? $row['item_code'] : '',
                        'item_name' => isset($row['item_name']) ? $row['item_name'] : '',
                        'description' => isset($row['description']) ? $row['description'] : '',
                        'quantity' => $qty,
                        'unit' => isset($row['unit']) ? $row['unit'] : 'Pcs',
                        'unit_price' => $unitPrice,
                        'discount' => $discount,
                        'tax' => $taxPct,
                        'line_total' => $lineTotal
                    ];
                }

                $additionalCharges = isset($data['additional_charges']) ? floatval($data['additional_charges']) : (isset($po['additional_charges']) ? floatval($po['additional_charges']) : 0);

                $po['items'] = $processedItems;
                $po['subtotal'] = round($subtotal, 2);
                $po['total_discount'] = round($totalDiscount, 2);
                $po['total_tax'] = round($totalTax, 2);
                $po['additional_charges'] = round($additionalCharges, 2);
                $po['grand_total'] = round(($subtotal - $totalDiscount) + $totalTax + $additionalCharges, 2);
            }

            $found = true;
            $updatedPO = $po;
            break;
        }
    }

    if ($found) {
        write_json_file('purchase_orders.json', $purchase_orders);
        json_response(true, $updatedPO, 'Purchase Order updated successfully');
    } else {
        json_response(false, null, 'Purchase Order not found', 404);
    }
}

if ($method === 'DELETE') {
    $data = parse_request_body();
    $id = isset($data['id']) ? $data['id'] : (isset($_GET['id']) ? $_GET['id'] : null);
    
    if (!$id) {
        json_response(false, null, 'ID parameter is required', 400);
    }

    $initialCount = count($purchase_orders);
    $purchase_orders = array_values(array_filter($purchase_orders, function($po) use ($id) {
        return $po['id'] != $id && $po['po_number'] != $id;
    }));

    if (count($purchase_orders) < $initialCount) {
        write_json_file('purchase_orders.json', $purchase_orders);
        json_response(true, null, 'Purchase order deleted successfully');
    } else {
        json_response(false, null, 'Purchase order not found', 404);
    }
}
