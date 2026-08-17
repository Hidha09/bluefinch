/**
 * Centralized API Communication Wrapper (AJAX / Fetch API)
 */
const API = {
  baseUrl: 'api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      // Support an offline/static preview only when the API cannot be reached.
      return this.fallbackLocalHandler(endpoint, options, err);
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error(`API returned an invalid response (${response.status})`);
    }

    // The included Node preview server has no PHP runtime. Keep its demo
    // fallback, but surface all real PHP validation and server errors.
    if (data && data.message === 'PHP CLI execution unavailable locally. Client fallback active.') {
      return this.fallbackLocalHandler(endpoint, options, new Error(data.message));
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || `API Error (${response.status})`);
    }
    return data;
  },

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(fullEndpoint, { method: 'GET' });
  },

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  async delete(endpoint, body) {
    return this.request(endpoint, {
      method: 'DELETE',
      body: JSON.stringify(body)
    });
  },

  // Fallback simulator if static HTML is loaded directly in browser without PHP server
  async fallbackLocalHandler(endpoint, options, originalError) {
    console.warn(`Falling back to client-side data store for ${endpoint}`);
    const key = endpoint.split('.php')[0].replace('api/', '');
    
    // Check if client-side session store exists
    if (!window._localDB) {
      window._localDB = {
        suppliers: [
          { id: 1, supplier_id: "SUPID-1001", supplier_code: "SUP-001", supplier_name: "Acme Industrial Supplies", contact_person: "Robert Vance", phone: "+1 (555) 234-5678", email: "sales@acmeind.com", address: "742 Evergreen Terrace, Sector 4", tax_number: "TAX-US-98765", payment_terms: "30 Days", status: "Active", created_at: "2026-01-10 10:30:00" },
          { id: 2, supplier_id: "SUPID-1002", supplier_code: "SUP-002", supplier_name: "Global Tech Components", contact_person: "Elena Rostova", phone: "+1 (555) 876-5432", email: "contact@globaltech.io", address: "100 Innovation Way, Suite 400", tax_number: "TAX-US-54321", payment_terms: "60 Days", status: "Active", created_at: "2026-01-15 14:20:00" },
          { id: 3, supplier_id: "SUPID-1003", supplier_code: "SUP-003", supplier_name: "Apex Logistics & Raw Materials", contact_person: "David Chen", phone: "+1 (555) 345-6789", email: "dchen@apexmaterials.com", address: "45 Harbor View Drive", tax_number: "TAX-US-11223", payment_terms: "Immediate", status: "Active", created_at: "2026-02-01 09:15:00" }
        ],
        items: [
          { id: 1, item_code: "ITM-0001", item_name: "High-Precision Steel Ball Bearings", description: "Grade 10 chrome steel ball bearings 25mm", category: "Hardware", unit: "Box", purchase_price: 120.00, tax: 18, status: "Active", created_at: "2026-01-10 11:00:00" },
          { id: 2, item_code: "ITM-0002", item_name: "Industrial Hydraulic Oil 20L", description: "ISO VG 46 Premium grade hydraulic lubricant fluid", category: "Chemicals", unit: "Can", purchase_price: 85.50, tax: 12, status: "Active", created_at: "2026-01-12 15:45:00" },
          { id: 3, item_code: "ITM-0003", item_name: "Embedded Controller Circuit Board", description: "ARM Cortex-M4 dual-core industrial controller unit", category: "Electronics", unit: "Pcs", purchase_price: 245.00, tax: 18, status: "Active", created_at: "2026-01-20 08:30:00" },
          { id: 4, item_code: "ITM-0004", item_name: "Heavy Duty Aluminium Casing", description: "Die-cast anodized aluminium enclosure 300x200x100mm", category: "Hardware", unit: "Pcs", purchase_price: 42.00, tax: 18, status: "Active", created_at: "2026-02-05 13:10:00" }
        ],
        purchase_orders: [
          { id: 1, po_number: "PO-2026-0001", po_date: "2026-02-01", supplier_id: 1, supplier_name: "Acme Industrial Supplies", expected_delivery_date: "2026-02-25", reference_number: "REF-ACME-884", payment_terms: "30 Days", delivery_location: "Main Warehouse - Gate 3", created_by: "John Doe (Purchasing Agent)", notes: "Urgent order for Q1 production run", status: "Completed", items: [{ item_id: 1, item_code: "ITM-0001", item_name: "High-Precision Steel Ball Bearings", description: "Grade 10 chrome steel ball bearings 25mm", quantity: 10, unit: "Box", unit_price: 120.00, discount: 50.00, tax: 18, line_total: 1357.00 }], subtotal: 1200.00, total_discount: 50.00, total_tax: 207.00, additional_charges: 75.00, grand_total: 1432.00, created_at: "2026-02-01 10:00:00" },
          { id: 2, po_number: "PO-2026-0002", po_date: "2026-02-10", supplier_id: 2, supplier_name: "Global Tech Components", expected_delivery_date: "2026-03-05", reference_number: "REF-GTC-2026-A", payment_terms: "60 Days", delivery_location: "Assembly Plant 2, Bay 7", created_by: "Sarah Smith (Procurement Manager)", notes: "Standard monthly restocking", status: "Pending", items: [{ item_id: 3, item_code: "ITM-0003", item_name: "Embedded Controller Circuit Board", description: "ARM Cortex-M4 dual-core unit", quantity: 15, unit: "Pcs", unit_price: 245.00, discount: 100.00, tax: 18, line_total: 4218.50 }], subtotal: 3675.00, total_discount: 100.00, total_tax: 643.50, additional_charges: 50.00, grand_total: 4268.50, created_at: "2026-02-10 11:30:00" },
          { id: 3, po_number: "PO-2026-0003", po_date: "2026-02-14", supplier_id: 3, supplier_name: "Apex Logistics & Raw Materials", expected_delivery_date: "2026-02-28", reference_number: "REF-APEX-9921", payment_terms: "Immediate", delivery_location: "Maintenance Depot", created_by: "John Doe (Purchasing Agent)", notes: "Draft order pending approval", status: "Draft", items: [{ item_id: 2, item_code: "ITM-0002", item_name: "Industrial Hydraulic Oil 20L", description: "ISO VG 46 Premium fluid", quantity: 5, unit: "Can", unit_price: 85.50, discount: 0.00, tax: 12, line_total: 478.80 }], subtotal: 427.50, total_discount: 0.00, total_tax: 51.30, additional_charges: 20.00, grand_total: 498.80, created_at: "2026-02-14 16:45:00" }
        ]
      };
    }

    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : {};

    if (key.includes('dashboard')) {
      const pos = window._localDB.purchase_orders;
      let total = pos.length, draft = 0, pending = 0, completed = 0;
      pos.forEach(p => {
        const s = (p.status || '').toLowerCase();
        if (s === 'draft') draft++;
        else if (s === 'pending' || s === 'submitted') pending++;
        else if (s === 'completed') completed++;
      });
      return { success: true, data: { total_pos: total, draft_pos: draft, pending_pos: pending, completed_pos: completed } };
    }

    if (key.includes('suppliers')) {
      if (endpoint.includes('next_codes')) {
        const nextId = 'SUPID-' + (1000 + window._localDB.suppliers.length + 1);
        const nextCode = 'SUP-' + String(window._localDB.suppliers.length + 1).padStart(3, '0');
        return { success: true, data: { supplier_id: nextId, supplier_code: nextCode } };
      }
      if (method === 'GET') return { success: true, data: window._localDB.suppliers };
      if (method === 'POST') {
        const newSup = {
          id: window._localDB.suppliers.length + 1,
          supplier_id: 'SUPID-' + (1000 + window._localDB.suppliers.length + 1),
          supplier_code: 'SUP-' + String(window._localDB.suppliers.length + 1).padStart(3, '0'),
          ...body,
          created_at: new Date().toISOString()
        };
        window._localDB.suppliers.push(newSup);
        return { success: true, data: newSup, message: 'Supplier added' };
      }
      if (method === 'PUT') {
        const idx = window._localDB.suppliers.findIndex(s => s.id == body.id);
        if (idx !== -1) {
          window._localDB.suppliers[idx] = { ...window._localDB.suppliers[idx], ...body };
          return { success: true, data: window._localDB.suppliers[idx], message: 'Supplier updated' };
        }
      }
      if (method === 'DELETE') {
        window._localDB.suppliers = window._localDB.suppliers.filter(s => s.id != body.id);
        return { success: true, message: 'Supplier deleted' };
      }
    }

    if (key.includes('items')) {
      if (endpoint.includes('next_code')) {
        const nextCode = 'ITM-' + String(window._localDB.items.length + 1).padStart(4, '0');
        return { success: true, data: { item_code: nextCode } };
      }
      if (method === 'GET') return { success: true, data: window._localDB.items };
      if (method === 'POST') {
        const newItem = {
          id: window._localDB.items.length + 1,
          item_code: 'ITM-' + String(window._localDB.items.length + 1).padStart(4, '0'),
          ...body,
          created_at: new Date().toISOString()
        };
        window._localDB.items.push(newItem);
        return { success: true, data: newItem, message: 'Item created' };
      }
      if (method === 'PUT') {
        const idx = window._localDB.items.findIndex(i => i.id == body.id);
        if (idx !== -1) {
          window._localDB.items[idx] = { ...window._localDB.items[idx], ...body };
          return { success: true, data: window._localDB.items[idx], message: 'Item updated' };
        }
      }
      if (method === 'DELETE') {
        window._localDB.items = window._localDB.items.filter(i => i.id != body.id);
        return { success: true, message: 'Item deleted' };
      }
    }

    if (key.includes('purchase_orders')) {
      if (endpoint.includes('next_po_number')) {
        const nextPo = 'PO-' + new Date().getFullYear() + '-' + String(window._localDB.purchase_orders.length + 1).padStart(4, '0');
        return { success: true, data: { po_number: nextPo } };
      }
      if (method === 'GET') {
        if (endpoint.includes('id=')) {
          const id = endpoint.split('id=')[1];
          const found = window._localDB.purchase_orders.find(p => p.id == id || p.po_number == id);
          return { success: true, data: found };
        }
        return { success: true, data: window._localDB.purchase_orders };
      }
      if (method === 'POST') {
        const poNum = 'PO-' + new Date().getFullYear() + '-' + String(window._localDB.purchase_orders.length + 1).padStart(4, '0');
        const newPO = {
          id: window._localDB.purchase_orders.length + 1,
          po_number: poNum,
          ...body,
          created_at: new Date().toISOString()
        };
        window._localDB.purchase_orders.push(newPO);
        return { success: true, data: newPO, message: 'PO Saved' };
      }
      if (method === 'PUT') {
        const idx = window._localDB.purchase_orders.findIndex(p => p.id == body.id);
        if (idx !== -1) {
          window._localDB.purchase_orders[idx] = { ...window._localDB.purchase_orders[idx], ...body };
          return { success: true, data: window._localDB.purchase_orders[idx], message: 'PO updated' };
        }
      }
      if (method === 'DELETE') {
        window._localDB.purchase_orders = window._localDB.purchase_orders.filter(p => p.id != body.id);
        return { success: true, message: 'PO deleted' };
      }
    }

    throw originalError;
  }
};

/**
 * Toast Notification Utility
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
