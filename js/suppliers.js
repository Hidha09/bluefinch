/**
 * Supplier Master View Handler
 */
let suppliersCache = [];

async function loadSuppliers(searchQuery = '') {
  try {
    const res = await API.get('suppliers.php', { search: searchQuery });
    if (res.success) {
      suppliersCache = res.data;
      renderSupplierTable(res.data);
    }
  } catch (err) {
    showToast('Failed to load suppliers: ' + err.message, 'error');
  }
}

function renderSupplierTable(suppliers) {
  const tbody = document.getElementById('supplier-table-body');
  if (!tbody) return;

  if (!suppliers || suppliers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-row"><i class="fa-solid fa-folder-open" style="font-size: 1.8rem; margin-bottom: 8px; color: var(--text-light); display: block;"></i> No suppliers found.</td></tr>`;
    return;
  }

  tbody.innerHTML = suppliers.map(s => `
    <tr>
      <td><strong style="color: var(--primary);">${escapeHtml(s.supplier_id || '')}</strong></td>
      <td><code>${escapeHtml(s.supplier_code || '')}</code></td>
      <td><strong>${escapeHtml(s.supplier_name || '')}</strong></td>
      <td>${escapeHtml(s.contact_person || '')}</td>
      <td>${escapeHtml(s.phone || '-')}</td>
      <td><a href="mailto:${escapeHtml(s.email || '')}" style="color: var(--primary); text-decoration: none;">${escapeHtml(s.email || '-')}</a></td>
      <td>${escapeHtml(s.tax_number || '-')}</td>
      <td>${escapeHtml(s.payment_terms || '-')}</td>
      <td><span class="badge ${s.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${escapeHtml(s.status || 'Active')}</span></td>
      <td style="text-align: right;">
        <div class="action-btns" style="justify-content: flex-end;">
          <button class="btn-icon edit" onclick="openEditSupplierModal(${s.id})" title="Edit Supplier"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon delete" onclick="deleteSupplier(${s.id})" title="Delete Supplier"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function openAddSupplierModal() {
  document.getElementById('supplier-form').reset();
  document.getElementById('supplier-edit-id').value = '';
  document.getElementById('supplier-modal-title').textContent = 'Add New Supplier';

  try {
    const res = await API.get('suppliers.php', { action: 'next_codes' });
    if (res.success && res.data) {
      document.getElementById('supplier-id-preview').value = res.data.supplier_id;
      document.getElementById('supplier-code-preview').value = res.data.supplier_code;
    }
  } catch (err) {
    document.getElementById('supplier-id-preview').value = 'Auto Generated';
    document.getElementById('supplier-code-preview').value = 'Auto Generated';
  }

  document.getElementById('modal-supplier').classList.add('show');
}

function openEditSupplierModal(id) {
  const supplier = suppliersCache.find(s => s.id == id);
  if (!supplier) return;

  document.getElementById('supplier-edit-id').value = supplier.id;
  document.getElementById('supplier-id-preview').value = supplier.supplier_id || '';
  document.getElementById('supplier-code-preview').value = supplier.supplier_code || '';
  document.getElementById('supplier-name').value = supplier.supplier_name || '';
  document.getElementById('supplier-contact').value = supplier.contact_person || '';
  document.getElementById('supplier-phone').value = supplier.phone || '';
  document.getElementById('supplier-email').value = supplier.email || '';
  document.getElementById('supplier-tax-no').value = supplier.tax_number || '';
  document.getElementById('supplier-payment-terms').value = supplier.payment_terms || '30 Days';
  document.getElementById('supplier-status').value = supplier.status || 'Active';
  document.getElementById('supplier-address').value = supplier.address || '';

  document.getElementById('supplier-modal-title').textContent = 'Edit Supplier';
  document.getElementById('modal-supplier').classList.add('show');
}

function closeSupplierModal() {
  document.getElementById('modal-supplier').classList.remove('show');
}

async function handleSupplierSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById('supplier-edit-id').value;
  const payload = {
    supplier_name: document.getElementById('supplier-name').value,
    contact_person: document.getElementById('supplier-contact').value,
    phone: document.getElementById('supplier-phone').value,
    email: document.getElementById('supplier-email').value,
    tax_number: document.getElementById('supplier-tax-no').value,
    payment_terms: document.getElementById('supplier-payment-terms').value,
    status: document.getElementById('supplier-status').value,
    address: document.getElementById('supplier-address').value
  };

  try {
    let res;
    if (editId) {
      payload.id = editId;
      res = await API.put('suppliers.php', payload);
    } else {
      res = await API.post('suppliers.php', payload);
    }

    if (res.success) {
      showToast(res.message || 'Supplier saved successfully!');
      closeSupplierModal();
      loadSuppliers();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteSupplier(id) {
  if (!confirm('Are you sure you want to delete this supplier?')) return;

  try {
    const res = await API.delete('suppliers.php', { id });
    if (res.success) {
      showToast('Supplier deleted successfully');
      loadSuppliers();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
