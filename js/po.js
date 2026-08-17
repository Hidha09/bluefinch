/**
 * Purchase Order Management View Handler
 */
let poCache = [];
let activeRowForPicker = null;

// Initialize PO List View
async function loadPOList() {
  const search = document.getElementById('po-search-input')?.value || '';
  const status = document.getElementById('po-status-filter')?.value || '';

  try {
    const res = await API.get('purchase_orders.php', { search, status });
    if (res.success) {
      poCache = res.data;
      renderPOTable(res.data);
    }
  } catch (err) {
    showToast('Failed to load purchase orders: ' + err.message, 'error');
  }
}

function renderPOTable(orders) {
  const tbody = document.getElementById('po-table-body');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row"><i class="fa-solid fa-file-circle-xmark" style="font-size: 1.8rem; margin-bottom: 8px; color: var(--text-light); display: block;"></i> No purchase orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(po => {
    let statusClass = 'badge-draft';
    const st = (po.status || 'Draft').toLowerCase();
    if (st === 'pending' || st === 'submitted') statusClass = 'badge-pending';
    else if (st === 'completed') statusClass = 'badge-completed';
    else if (st === 'cancelled') statusClass = 'badge-cancelled';

    return `
      <tr>
        <td><strong style="color: var(--primary);">${escapeHtml(po.po_number || '')}</strong></td>
        <td>${escapeHtml(po.po_date || '')}</td>
        <td><strong>${escapeHtml(po.supplier_name || '')}</strong></td>
        <td><strong>$${parseFloat(po.grand_total || 0).toFixed(2)}</strong></td>
        <td><span class="badge ${statusClass}">${escapeHtml(po.status || 'Draft')}</span></td>
        <td>${escapeHtml(po.created_by || 'System')}</td>
        <td style="text-align: right;">
          <div class="action-btns" style="justify-content: flex-end;">
            <button class="btn-icon view" onclick="viewPODetails(${po.id})" title="View Details"><i class="fa-solid fa-eye"></i></button>
            <button class="btn-icon edit" onclick="openEditPOForm(${po.id})" title="Edit PO"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon delete" onclick="deletePO(${po.id})" title="Delete PO"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Populate Supplier Dropdown in PO Form
async function populateSupplierDropdown(selectedId = null) {
  const select = document.getElementById('po-supplier-id');
  if (!select) return;

  try {
    const res = await API.get('suppliers.php');
    if (res.success && res.data) {
      const activeSuppliers = res.data.filter(s => s.status === 'Active' || s.id == selectedId);
      select.innerHTML = `<option value="">-- Select Supplier --</option>` +
        activeSuppliers.map(s => `<option value="${s.id}" data-name="${escapeHtml(s.supplier_name)}" data-terms="${escapeHtml(s.payment_terms || '')}" ${s.id == selectedId ? 'selected' : ''}>${escapeHtml(s.supplier_name)} (${s.supplier_code})</option>`).join('');
    }
  } catch (err) {
    console.error('Failed to populate suppliers:', err);
  }
}

// Open Create PO Form
async function openCreatePOForm() {
  const form = document.getElementById('po-form');
  if (form) form.reset();

  const editIdEl = document.getElementById('po-edit-id');
  if (editIdEl) editIdEl.value = '';

  const formTitleEl = document.getElementById('po-form-title');
  if (formTitleEl) formTitleEl.textContent = 'Section 1: Purchase Order Information';

  const itemsTableBody = document.getElementById('po-items-table-body');
  if (itemsTableBody) itemsTableBody.innerHTML = '';

  const poDateEl = document.getElementById('po-date');
  if (poDateEl) poDateEl.value = new Date().toISOString().split('T')[0];

  const createdByEl = document.getElementById('po-created-by');
  if (createdByEl) createdByEl.value = 'John Doe (Procurement Agent)';

  await populateSupplierDropdown();

  try {
    const res = await API.get('purchase_orders.php', { action: 'next_po_number' });
    if (res.success && res.data && res.data.po_number) {
      const poNumEl = document.getElementById('po-number');
      if (poNumEl) poNumEl.value = res.data.po_number;
    }
  } catch (err) {
    const poNumEl = document.getElementById('po-number');
    if (poNumEl) poNumEl.value = 'PO-2026-0001';
  }

  // Add 1 default empty item row
  addPOItemRow();
  calculatePOSummary();

  showView('po-form');
}

// Open Edit PO Form
async function openEditPOForm(id) {
  const po = poCache.find(p => p.id == id);
  if (!po) return;

  const editIdEl = document.getElementById('po-edit-id');
  if (editIdEl) editIdEl.value = po.id;

  const formTitleEl = document.getElementById('po-form-title');
  if (formTitleEl) formTitleEl.textContent = `Edit Purchase Order (${po.po_number})`;

  const poNumEl = document.getElementById('po-number');
  if (poNumEl) poNumEl.value = po.po_number || '';

  const poDateEl = document.getElementById('po-date');
  if (poDateEl) poDateEl.value = po.po_date || '';

  const expDateEl = document.getElementById('po-expected-date');
  if (expDateEl) expDateEl.value = po.expected_delivery_date || '';

  const refNoEl = document.getElementById('po-reference-no');
  if (refNoEl) refNoEl.value = po.reference_number || '';

  const termsEl = document.getElementById('po-payment-terms');
  if (termsEl) termsEl.value = po.payment_terms || '30 Days';

  const locEl = document.getElementById('po-delivery-location');
  if (locEl) locEl.value = po.delivery_location || '';

  const createdByEl = document.getElementById('po-created-by');
  if (createdByEl) createdByEl.value = po.created_by || 'John Doe (Procurement Agent)';

  const notesEl = document.getElementById('po-notes');
  if (notesEl) notesEl.value = po.notes || '';

  const addChargesEl = document.getElementById('po-additional-charges');
  if (addChargesEl) addChargesEl.value = parseFloat(po.additional_charges || 0).toFixed(2);

  await populateSupplierDropdown(po.supplier_id);

  // Populate Item Rows
  const tbody = document.getElementById('po-items-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    if (po.items && po.items.length > 0) {
      po.items.forEach(item => addPOItemRow(item));
    } else {
      addPOItemRow();
    }
  }

  calculatePOSummary();
  showView('po-form');
}

// Add Dynamic Item Row to PO Form
function addPOItemRow(itemData = null) {
  const tbody = document.getElementById('po-items-table-body');
  if (!tbody) return;

  const rowId = 'row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const tr = document.createElement('tr');
  tr.id = rowId;

  tr.innerHTML = `
    <td>
      <input type="hidden" class="row-item-id" value="${itemData ? itemData.item_id || '' : ''}">
      <button type="button" class="btn btn-secondary btn-sm item-select-btn" onclick="openItemPickerModal('${rowId}')" style="width: 100%; justify-content: flex-start;">
        <i class="fa-solid fa-magnifying-glass" style="color: var(--primary);"></i>
        <span class="row-item-name-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${itemData ? escapeHtml(itemData.item_name || 'Select Item...') : 'Select Item...'}</span>
      </button>
    </td>
    <td>
      <input type="text" class="form-control row-item-code" readonly value="${itemData ? escapeHtml(itemData.item_code || '') : ''}">
    </td>
    <td>
      <input type="text" class="form-control row-description" value="${itemData ? escapeHtml(itemData.description || '') : ''}" placeholder="Description">
    </td>
    <td>
      <input type="number" class="form-control row-qty" min="1" step="1" value="${itemData ? (itemData.quantity || 1) : 1}" oninput="calculateRowAndSummary('${rowId}')">
    </td>
    <td>
      <input type="text" class="form-control row-unit" readonly value="${itemData ? escapeHtml(itemData.unit || 'Pcs') : 'Pcs'}">
    </td>
    <td>
      <input type="number" class="form-control row-price" min="0" step="0.01" value="${itemData ? parseFloat(itemData.unit_price || 0).toFixed(2) : '0.00'}" oninput="calculateRowAndSummary('${rowId}')">
    </td>
    <td>
      <input type="number" class="form-control row-discount" min="0" step="0.01" value="${itemData ? parseFloat(itemData.discount || 0).toFixed(2) : '0.00'}" oninput="calculateRowAndSummary('${rowId}')">
    </td>
    <td>
      <input type="number" class="form-control row-tax" min="0" step="0.1" value="${itemData ? (itemData.tax || 0) : 0}" oninput="calculateRowAndSummary('${rowId}')">
    </td>
    <td>
      <strong class="row-linetotal">$${itemData ? parseFloat(itemData.line_total || 0).toFixed(2) : '0.00'}</strong>
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn-icon delete" onclick="removePOItemRow('${rowId}')" title="Remove Row"><i class="fa-solid fa-xmark"></i></button>
    </td>
  `;

  tbody.appendChild(tr);
  calculateRowAndSummary(rowId);
}

function removePOItemRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) {
    row.remove();
    calculatePOSummary();
  }
}

// Calculate Single Row Line Total & Trigger Summary Calculation
function calculateRowAndSummary(rowId) {
  const row = document.getElementById(rowId);
  if (!row) return;

  const qty = parseFloat(row.querySelector('.row-qty')?.value) || 0;
  const price = parseFloat(row.querySelector('.row-price')?.value) || 0;
  const discount = parseFloat(row.querySelector('.row-discount')?.value) || 0;
  const taxPct = parseFloat(row.querySelector('.row-tax')?.value) || 0;

  const rawAmount = qty * price;
  const afterDiscount = Math.max(0, rawAmount - discount);
  const taxAmount = (afterDiscount * taxPct) / 100;
  const lineTotal = afterDiscount + taxAmount;

  const lineTotalEl = row.querySelector('.row-linetotal');
  if (lineTotalEl) lineTotalEl.textContent = '$' + lineTotal.toFixed(2);
  calculatePOSummary();
}

// Real-Time Total PO Summary Calculation
function calculatePOSummary() {
  const rows = document.querySelectorAll('#po-items-table-body tr');
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.row-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.row-price')?.value) || 0;
    const discount = parseFloat(row.querySelector('.row-discount')?.value) || 0;
    const taxPct = parseFloat(row.querySelector('.row-tax')?.value) || 0;

    const rawAmount = qty * price;
    const afterDiscount = Math.max(0, rawAmount - discount);
    const taxAmount = (afterDiscount * taxPct) / 100;

    subtotal += rawAmount;
    totalDiscount += discount;
    totalTax += taxAmount;
  });

  const additionalCharges = parseFloat(document.getElementById('po-additional-charges')?.value) || 0;
  const grandTotal = (subtotal - totalDiscount) + totalTax + additionalCharges;

  const subEl = document.getElementById('po-summary-subtotal');
  if (subEl) subEl.textContent = '$' + subtotal.toFixed(2);

  const discEl = document.getElementById('po-summary-discount');
  if (discEl) discEl.textContent = '-$' + totalDiscount.toFixed(2);

  const taxEl = document.getElementById('po-summary-tax');
  if (taxEl) taxEl.textContent = '$' + totalTax.toFixed(2);

  const grandEl = document.getElementById('po-summary-grandtotal');
  if (grandEl) grandEl.textContent = '$' + grandTotal.toFixed(2);
}

// Item Selection Popup Modal
async function openItemPickerModal(rowId) {
  activeRowForPicker = rowId;
  const tbody = document.getElementById('picker-table-body');
  if (!tbody) return;

  try {
    const res = await API.get('items.php');
    if (res.success && res.data) {
      if (typeof itemsCache !== 'undefined') itemsCache = res.data;
      const activeItems = res.data.filter(i => i.status === 'Active');
      renderPickerItems(activeItems);
    }
  } catch (err) {
    showToast('Failed to load item master: ' + err.message, 'error');
  }

  const modal = document.getElementById('modal-item-picker');
  if (modal) modal.classList.add('show');
}

function renderPickerItems(items) {
  const tbody = document.getElementById('picker-table-body');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No active items available.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td><code>${escapeHtml(item.item_code)}</code></td>
      <td><strong>${escapeHtml(item.item_name)}</strong></td>
      <td>${escapeHtml(item.category || 'General')}</td>
      <td>${escapeHtml(item.unit || 'Pcs')}</td>
      <td>$${parseFloat(item.purchase_price || 0).toFixed(2)}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="selectItemForPO(${item.id})">Select</button>
      </td>
    </tr>
  `).join('');
}

function selectItemForPO(itemId) {
  let item = null;
  if (typeof itemsCache !== 'undefined' && itemsCache.length > 0) {
    item = itemsCache.find(i => i.id == itemId);
  }

  if (!item || !activeRowForPicker) return;

  const row = document.getElementById(activeRowForPicker);
  if (row) {
    row.querySelector('.row-item-id').value = item.id;
    row.querySelector('.row-item-name-text').textContent = item.item_name;
    row.querySelector('.row-item-code').value = item.item_code || '';
    row.querySelector('.row-description').value = item.description || item.item_name;
    row.querySelector('.row-unit').value = item.unit || 'Pcs';
    row.querySelector('.row-price').value = parseFloat(item.purchase_price || 0).toFixed(2);
    row.querySelector('.row-tax').value = item.tax || 0;
    calculateRowAndSummary(activeRowForPicker);
  }

  closeItemPickerModal();
}

function closeItemPickerModal() {
  const modal = document.getElementById('modal-item-picker');
  if (modal) modal.classList.remove('show');
  activeRowForPicker = null;
}

// Submit PO (Draft or Submitted/Pending)
async function savePO(status = 'Draft') {
  const editId = document.getElementById('po-edit-id')?.value || '';
  const supplierSelect = document.getElementById('po-supplier-id');
  const supplierId = supplierSelect?.value || '';
  
  let supplierName = '';
  if (supplierSelect && supplierSelect.selectedIndex >= 0) {
    const selectedOpt = supplierSelect.options[supplierSelect.selectedIndex];
    supplierName = selectedOpt ? (selectedOpt.getAttribute('data-name') || selectedOpt.text.split(' (')[0]) : '';
  }

  const poDate = document.getElementById('po-date')?.value || '';

  if (!supplierId) {
    showToast('Please select a supplier', 'error');
    return;
  }
  if (!poDate) {
    showToast('Please select PO Date', 'error');
    return;
  }

  const rows = document.querySelectorAll('#po-items-table-body tr');
  if (rows.length === 0) {
    showToast('Please add at least one item row', 'error');
    return;
  }

  const items = [];
  let valid = true;

  rows.forEach((row, index) => {
    const itemId = row.querySelector('.row-item-id')?.value || '';
    const itemName = row.querySelector('.row-item-name-text')?.textContent || '';
    const itemCode = row.querySelector('.row-item-code')?.value || '';
    const description = row.querySelector('.row-description')?.value || '';
    const qty = parseFloat(row.querySelector('.row-qty')?.value);
    const unit = row.querySelector('.row-unit')?.value || 'Pcs';
    const price = parseFloat(row.querySelector('.row-price')?.value) || 0;
    const discount = parseFloat(row.querySelector('.row-discount')?.value) || 0;
    const tax = parseFloat(row.querySelector('.row-tax')?.value) || 0;

    if (!itemCode || itemName === 'Select Item...') {
      showToast(`Row #${index + 1}: Please select an item from Master`, 'error');
      valid = false;
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      showToast(`Row #${index + 1}: Quantity must be greater than 0`, 'error');
      valid = false;
      return;
    }

    items.push({
      item_id: itemId || null,
      item_code: itemCode,
      item_name: itemName,
      description: description,
      quantity: qty,
      unit: unit,
      unit_price: price,
      discount: discount,
      tax: tax
    });
  });

  if (!valid) return;

  const payload = {
    po_date: poDate,
    supplier_id: supplierId,
    supplier_name: supplierName,
    expected_delivery_date: document.getElementById('po-expected-date')?.value || '',
    reference_number: document.getElementById('po-reference-no')?.value || '',
    payment_terms: document.getElementById('po-payment-terms')?.value || '30 Days',
    delivery_location: document.getElementById('po-delivery-location')?.value || '',
    created_by: document.getElementById('po-created-by')?.value || 'John Doe (Procurement Agent)',
    notes: document.getElementById('po-notes')?.value || '',
    additional_charges: parseFloat(document.getElementById('po-additional-charges')?.value) || 0,
    status: status,
    items: items
  };

  try {
    let res;
    if (editId) {
      payload.id = editId;
      res = await API.put('purchase_orders.php', payload);
    } else {
      res = await API.post('purchase_orders.php', payload);
    }

    if (res.success) {
      showToast(res.message || `Purchase Order saved as ${status}`);
      showView('po-list');
      loadPOList();
      loadDashboard();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delete PO
async function deletePO(id) {
  if (!confirm('Are you sure you want to delete this purchase order?')) return;

  try {
    const res = await API.delete('purchase_orders.php', { id });
    if (res.success) {
      showToast('Purchase Order deleted successfully');
      loadPOList();
      loadDashboard();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// View PO Details Modal
function viewPODetails(id) {
  const po = poCache.find(p => p.id == id);
  if (!po) return;

  const content = document.getElementById('po-view-details-content');
  if (!content) return;

  let statusClass = 'badge-draft';
  const st = (po.status || 'Draft').toLowerCase();
  if (st === 'pending' || st === 'submitted') statusClass = 'badge-pending';
  else if (st === 'completed') statusClass = 'badge-completed';

  content.innerHTML = `
    <div style="border-bottom: 2px solid var(--border-color); padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2 style="font-size: 1.4rem; color: var(--primary); margin-bottom: 4px;">${escapeHtml(po.po_number)}</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Date: ${escapeHtml(po.po_date)} | Created By: ${escapeHtml(po.created_by)}</p>
      </div>
      <span class="badge ${statusClass}" style="font-size: 0.9rem; padding: 6px 14px;">${escapeHtml(po.status)}</span>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 0.88rem;">
      <div style="background-color: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid var(--border-color);">
        <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Supplier Information</h4>
        <p style="font-weight: 700; font-size: 1rem;">${escapeHtml(po.supplier_name)}</p>
        <p style="color: var(--text-muted);">Payment Terms: ${escapeHtml(po.payment_terms || '30 Days')}</p>
        <p style="color: var(--text-muted);">Reference #: ${escapeHtml(po.reference_number || 'N/A')}</p>
      </div>
      <div style="background-color: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid var(--border-color);">
        <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Delivery Details</h4>
        <p style="font-weight: 600;">Expected Delivery: ${escapeHtml(po.expected_delivery_date || 'N/A')}</p>
        <p style="color: var(--text-muted);">Location: ${escapeHtml(po.delivery_location || 'N/A')}</p>
        <p style="color: var(--text-muted);">Notes: ${escapeHtml(po.notes || 'None')}</p>
      </div>
    </div>

    <h4 style="font-size: 0.95rem; margin-bottom: 10px;">Item Breakdown</h4>
    <div class="table-responsive" style="margin-bottom: 20px;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Item Code</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Discount</th>
            <th>Tax %</th>
            <th style="text-align: right;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${(po.items || []).map(item => `
            <tr>
              <td><strong>${escapeHtml(item.item_name)}</strong></td>
              <td><code>${escapeHtml(item.item_code)}</code></td>
              <td>${item.quantity} ${escapeHtml(item.unit)}</td>
              <td>$${parseFloat(item.unit_price || 0).toFixed(2)}</td>
              <td>-$${parseFloat(item.discount || 0).toFixed(2)}</td>
              <td>${item.tax || 0}%</td>
              <td style="text-align: right;"><strong>$${parseFloat(item.line_total || 0).toFixed(2)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 280px; font-size: 0.88rem;">
        <div style="display: flex; justify-content: space-between; padding: 4px 0;"><span>Subtotal:</span><span>$${parseFloat(po.subtotal || 0).toFixed(2)}</span></div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #ef4444;"><span>Total Discount:</span><span>-$${parseFloat(po.total_discount || 0).toFixed(2)}</span></div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;"><span>Total Tax:</span><span>$${parseFloat(po.total_tax || 0).toFixed(2)}</span></div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;"><span>Additional Charges:</span><span>$${parseFloat(po.additional_charges || 0).toFixed(2)}</span></div>
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid var(--border-color); font-size: 1.1rem; font-weight: 700; color: var(--primary);"><span>Grand Total:</span><span>$${parseFloat(po.grand_total || 0).toFixed(2)}</span></div>
      </div>
    </div>
  `;

  const modal = document.getElementById('modal-view-po');
  if (modal) modal.classList.add('show');
}
