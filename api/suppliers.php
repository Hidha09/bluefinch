<?php
require_once __DIR__ . '/db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$suppliers = read_json_file('suppliers.json');

if ($method === 'GET') {
    if (isset($_GET['action']) && $_GET['action'] === 'next_codes') {
        json_response(true, [
            'supplier_id' => generate_next_supplier_id($suppliers),
            'supplier_code' => generate_next_supplier_code($suppliers)
        ]);
    }
    
    $search = isset($_GET['search']) ? trim(strtolower($_GET['search'])) : '';
    if ($search !== '') {
        $suppliers = array_values(array_filter($suppliers, function($s) use ($search) {
            return strpos(strtolower($s['supplier_name']), $search) !== false ||
                   strpos(strtolower($s['supplier_code']), $search) !== false ||
                   strpos(strtolower($s['supplier_id']), $search) !== false ||
                   strpos(strtolower($s['contact_person']), $search) !== false;
        }));
    }
    json_response(true, $suppliers);
}

if ($method === 'POST') {
    $data = parse_request_body();
    
    if (empty($data['supplier_name'])) {
        json_response(false, null, 'Supplier Name is required', 400);
    }
    if (empty($data['contact_person'])) {
        json_response(false, null, 'Contact Person is required', 400);
    }
    if (empty($data['email'])) {
        json_response(false, null, 'Email is required', 400);
    }
    if (!is_valid_email($data['email'])) {
        json_response(false, null, 'Please provide a valid email address', 400);
    }
    if (isset($data['status']) && !is_valid_status($data['status'], ['Active', 'Inactive'])) {
        json_response(false, null, 'Supplier status must be Active or Inactive', 400);
    }

    $maxIntegerId = 0;
    foreach ($suppliers as $s) {
        if (isset($s['id']) && $s['id'] > $maxIntegerId) {
            $maxIntegerId = $s['id'];
        }
    }

    $newSupplier = [
        'id' => $maxIntegerId + 1,
        'supplier_id' => generate_next_supplier_id($suppliers),
        'supplier_code' => generate_next_supplier_code($suppliers),
        'supplier_name' => trim($data['supplier_name']),
        'contact_person' => trim($data['contact_person']),
        'phone' => isset($data['phone']) ? trim($data['phone']) : '',
        'email' => trim($data['email']),
        'address' => isset($data['address']) ? trim($data['address']) : '',
        'tax_number' => isset($data['tax_number']) ? trim($data['tax_number']) : '',
        'payment_terms' => isset($data['payment_terms']) ? trim($data['payment_terms']) : '30 Days',
        'status' => isset($data['status']) ? trim($data['status']) : 'Active',
        'created_at' => date('Y-m-d H:i:s')
    ];

    $suppliers[] = $newSupplier;
    write_json_file('suppliers.json', $suppliers);
    json_response(true, $newSupplier, 'Supplier added successfully');
}

if ($method === 'PUT') {
    $data = parse_request_body();
    if (empty($data['id'])) {
        json_response(false, null, 'Supplier ID is required for update', 400);
    }
    if (isset($data['email']) && !is_valid_email($data['email'])) {
        json_response(false, null, 'Please provide a valid email address', 400);
    }
    if (isset($data['status']) && !is_valid_status($data['status'], ['Active', 'Inactive'])) {
        json_response(false, null, 'Supplier status must be Active or Inactive', 400);
    }

    $found = false;
    foreach ($suppliers as &$s) {
        if ($s['id'] == $data['id']) {
            if (isset($data['supplier_name'])) $s['supplier_name'] = trim($data['supplier_name']);
            if (isset($data['contact_person'])) $s['contact_person'] = trim($data['contact_person']);
            if (isset($data['phone'])) $s['phone'] = trim($data['phone']);
            if (isset($data['email'])) $s['email'] = trim($data['email']);
            if (isset($data['address'])) $s['address'] = trim($data['address']);
            if (isset($data['tax_number'])) $s['tax_number'] = trim($data['tax_number']);
            if (isset($data['payment_terms'])) $s['payment_terms'] = trim($data['payment_terms']);
            if (isset($data['status'])) $s['status'] = trim($data['status']);
            $found = true;
            $updatedSupplier = $s;
            break;
        }
    }

    if ($found) {
        write_json_file('suppliers.json', $suppliers);
        json_response(true, $updatedSupplier, 'Supplier updated successfully');
    } else {
        json_response(false, null, 'Supplier not found', 404);
    }
}

if ($method === 'DELETE') {
    $data = parse_request_body();
    $id = isset($data['id']) ? $data['id'] : (isset($_GET['id']) ? $_GET['id'] : null);
    
    if (!$id) {
        json_response(false, null, 'ID parameter is required', 400);
    }

    $initialCount = count($suppliers);
    $suppliers = array_values(array_filter($suppliers, function($s) use ($id) {
        return $s['id'] != $id;
    }));

    if (count($suppliers) < $initialCount) {
        write_json_file('suppliers.json', $suppliers);
        json_response(true, null, 'Supplier deleted successfully');
    } else {
        json_response(false, null, 'Supplier not found', 404);
    }
}
