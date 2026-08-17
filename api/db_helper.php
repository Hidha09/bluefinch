<?php
// Centralized JSON storage & utility helper for PHP APIs

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function get_data_dir() {
    $dir = __DIR__ . '/../data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
    // Fallback to /tmp on serverless environments if not writable
    if (!is_writable($dir)) {
        $tmpDir = sys_get_temp_dir() . '/bluefinch_data';
        if (!is_dir($tmpDir)) {
            @mkdir($tmpDir, 0777, true);
        }
        return $tmpDir;
    }
    return $dir;
}

function get_json_file_path($filename) {
    $dataDir = get_data_dir();
    $filePath = $dataDir . '/' . $filename;
    
    // Copy initial seed file if file doesn't exist in writable location
    $sourceSeed = __DIR__ . '/../data/' . $filename;
    if (!file_exists($filePath) && file_exists($sourceSeed)) {
        copy($sourceSeed, $filePath);
    }
    return $filePath;
}

function read_json_file($filename) {
    $filePath = get_json_file_path($filename);
    if (!file_exists($filePath)) {
        return [];
    }
    $content = file_get_contents($filePath);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function write_json_file($filename, $data) {
    $filePath = get_json_file_path($filename);
    $json = json_encode($data, JSON_PRETTY_PRINT);
    return file_put_contents($filePath, $json) !== false;
}

function json_response($success, $data = null, $message = '', $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}

function parse_request_body() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    if (is_array($data)) {
        return $data;
    }
    return $_POST;
}

function is_valid_email($email) {
    return filter_var(trim((string)$email), FILTER_VALIDATE_EMAIL) !== false;
}

function is_valid_status($status, $allowedStatuses) {
    return in_array(trim((string)$status), $allowedStatuses, true);
}

function is_non_negative_number($value) {
    return is_numeric($value) && floatval($value) >= 0;
}

// System Auto-Generators
function generate_next_supplier_id($suppliers) {
    $maxId = 1000;
    foreach ($suppliers as $s) {
        if (isset($s['supplier_id']) && preg_match('/SUPID-(\d+)/i', $s['supplier_id'], $matches)) {
            $num = intval($matches[1]);
            if ($num > $maxId) $maxId = $num;
        }
    }
    return 'SUPID-' . ($maxId + 1);
}

function generate_next_supplier_code($suppliers) {
    $maxNum = 0;
    foreach ($suppliers as $s) {
        if (isset($s['supplier_code']) && preg_match('/SUP-(\d+)/i', $s['supplier_code'], $matches)) {
            $num = intval($matches[1]);
            if ($num > $maxNum) $maxNum = $num;
        }
    }
    return 'SUP-' . str_pad($maxNum + 1, 3, '0', STR_PAD_LEFT);
}

function generate_next_item_code($items) {
    $maxNum = 0;
    foreach ($items as $item) {
        if (isset($item['item_code']) && preg_match('/ITM-(\d+)/i', $item['item_code'], $matches)) {
            $num = intval($matches[1]);
            if ($num > $maxNum) $maxNum = $num;
        }
    }
    return 'ITM-' . str_pad($maxNum + 1, 4, '0', STR_PAD_LEFT);
}

function generate_next_po_number($purchase_orders) {
    $year = date('Y');
    $maxNum = 0;
    foreach ($purchase_orders as $po) {
        if (isset($po['po_number']) && preg_match('/PO-(\d+)-(\d+)/i', $po['po_number'], $matches)) {
            $num = intval($matches[2]);
            if ($num > $maxNum) $maxNum = $num;
        }
    }
    return 'PO-' . $year . '-' . str_pad($maxNum + 1, 4, '0', STR_PAD_LEFT);
}
