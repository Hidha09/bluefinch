<?php
require_once __DIR__ . '/db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$items = read_json_file('items.json');

if ($method === 'GET') {
    if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
        json_response(true, [
            'item_code' => generate_next_item_code($items)
        ]);
    }
    
    $search = isset($_GET['search']) ? trim(strtolower($_GET['search'])) : '';
    if ($search !== '') {
        $items = array_values(array_filter($items, function($item) use ($search) {
            return strpos(strtolower($item['item_name']), $search) !== false ||
                   strpos(strtolower($item['item_code']), $search) !== false ||
                   strpos(strtolower($item['category']), $search) !== false;
        }));
    }
    json_response(true, $items);
}

if ($method === 'POST') {
    $data = parse_request_body();
    
    if (empty($data['item_name'])) {
        json_response(false, null, 'Item Name is required', 400);
    }
    if (!isset($data['purchase_price']) || floatval($data['purchase_price']) < 0) {
        json_response(false, null, 'Valid Purchase Price is required', 400);
    }

    $maxIntegerId = 0;
    foreach ($items as $item) {
        if (isset($item['id']) && $item['id'] > $maxIntegerId) {
            $maxIntegerId = $item['id'];
        }
    }

    $newItem = [
        'id' => $maxIntegerId + 1,
        'item_code' => generate_next_item_code($items),
        'item_name' => trim($data['item_name']),
        'description' => isset($data['description']) ? trim($data['description']) : '',
        'category' => isset($data['category']) ? trim($data['category']) : 'General',
        'unit' => isset($data['unit']) ? trim($data['unit']) : 'Pcs',
        'purchase_price' => floatval($data['purchase_price']),
        'tax' => isset($data['tax']) ? floatval($data['tax']) : 0,
        'status' => isset($data['status']) ? trim($data['status']) : 'Active',
        'created_at' => date('Y-m-d H:i:s')
    ];

    $items[] = $newItem;
    write_json_file('items.json', $items);
    json_response(true, $newItem, 'Item created successfully');
}

if ($method === 'PUT') {
    $data = parse_request_body();
    if (empty($data['id'])) {
        json_response(false, null, 'Item ID is required for update', 400);
    }

    $found = false;
    foreach ($items as &$item) {
        if ($item['id'] == $data['id']) {
            if (isset($data['item_name'])) $item['item_name'] = trim($data['item_name']);
            if (isset($data['description'])) $item['description'] = trim($data['description']);
            if (isset($data['category'])) $item['category'] = trim($data['category']);
            if (isset($data['unit'])) $item['unit'] = trim($data['unit']);
            if (isset($data['purchase_price'])) $item['purchase_price'] = floatval($data['purchase_price']);
            if (isset($data['tax'])) $item['tax'] = floatval($data['tax']);
            if (isset($data['status'])) $item['status'] = trim($data['status']);
            $found = true;
            $updatedItem = $item;
            break;
        }
    }

    if ($found) {
        write_json_file('items.json', $items);
        json_response(true, $updatedItem, 'Item updated successfully');
    } else {
        json_response(false, null, 'Item not found', 404);
    }
}

if ($method === 'DELETE') {
    $data = parse_request_body();
    $id = isset($data['id']) ? $data['id'] : (isset($_GET['id']) ? $_GET['id'] : null);
    
    if (!$id) {
        json_response(false, null, 'ID parameter is required', 400);
    }

    $initialCount = count($items);
    $items = array_values(array_filter($items, function($item) use ($id) {
        return $item['id'] != $id;
    }));

    if (count($items) < $initialCount) {
        write_json_file('items.json', $items);
        json_response(true, null, 'Item deleted successfully');
    } else {
        json_response(false, null, 'Item not found', 404);
    }
}
