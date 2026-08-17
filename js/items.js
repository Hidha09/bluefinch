/**
 * Item Master View Handler
 */
let itemsCache = [];

async function loadItems(searchQuery = '') {
  try {
    const res = await API.get('items.php', { search: searchQuery });
    if (res.success) {
      itemsCache = res.data;
      renderItemTable(res.data);
    }
  } catch (err) {
    showToast('Failed to load items: ' + err.message, 'error');
  }
}

function renderItemTable(items) {
  const tbody = document.getElementById('item-table-body');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row"><i class="fa-solid fa-box-open" style="font-size: 1.8rem; margin-bottom: 8px; color: var(--text-light); display: block;"></i> No items found.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td><code>${escapeHtml(item.item_code || '')}</code></td>
      <td><strong>${escapeHtml(item.item_name || '')}</strong></td>
      <td style="max-width: 240px; color: var(--text-muted);">${escapeHtml(item.description || '-')}</td>
      <td><span class="badge" style="background-color: #f1f5f9; color: #475569;">${escapeHtml(item.category || 'General')}</span></td>
      <td>${escapeHtml(item.unit || 'Pcs')}</td>
      <td><strong>$${parseFloat(item.purchase_price || 0).toFixed(2)}</strong></td>
      <td>${item.tax || 0}%</td>
      <td><span class="badge ${item.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${escapeHtml(item.status || 'Active')}</span></td>
      <td style="text-align: right;">
        <div class="action-btns" style="justify-content: flex-end;">
          <button class="btn-icon edit" onclick="openEditItemModal(${item.id})" title="Edit Item"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon delete" onclick="deleteItem(${item.id})" title="Delete Item"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function openAddItemModal() {
  document.getElementById('item-form').reset();
  document.getElementById('item-edit-id').value = '';
  document.getElementById('item-modal-title').textContent = 'Add New Item';

  try {
    const res = await API.get('items.php', { action: 'next_code' });
    if (res.success && res.data) {
      document.getElementById('item-code-preview').value = res.data.item_code;
    }
  } catch (err) {
    document.getElementById('item-code-preview').value = 'Auto Generated';
  }

  document.getElementById('modal-item').classList.add('show');
}

function openEditItemModal(id) {
  const item = itemsCache.find(i => i.id == id);
  if (!item) return;

  document.getElementById('item-edit-id').value = item.id;
  document.getElementById('item-code-preview').value = item.item_code || '';
  document.getElementById('item-name').value = item.item_name || '';
  document.getElementById('item-category').value = item.category || '';
  document.getElementById('item-unit').value = item.unit || 'Pcs';
  document.getElementById('item-price').value = item.purchase_price || 0;
  document.getElementById('item-tax').value = item.tax || 0;
  document.getElementById('item-status').value = item.status || 'Active';
  document.getElementById('item-description').value = item.description || '';

  document.getElementById('item-modal-title').textContent = 'Edit Item';
  document.getElementById('modal-item').classList.add('show');
}

function closeItemModal() {
  document.getElementById('modal-item').classList.remove('show');
}

async function handleItemSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById('item-edit-id').value;
  const payload = {
    item_name: document.getElementById('item-name').value,
    category: document.getElementById('item-category').value,
    unit: document.getElementById('item-unit').value,
    purchase_price: parseFloat(document.getElementById('item-price').value),
    tax: parseFloat(document.getElementById('item-tax').value || 0),
    status: document.getElementById('item-status').value,
    description: document.getElementById('item-description').value
  };

  try {
    let res;
    if (editId) {
      payload.id = editId;
      res = await API.put('items.php', payload);
    } else {
      res = await API.post('items.php', payload);
    }

    if (res.success) {
      showToast(res.message || 'Item saved successfully!');
      closeItemModal();
      loadItems();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteItem(id) {
  if (!confirm('Are you sure you want to delete this item?')) return;

  try {
    const res = await API.delete('items.php', { id });
    if (res.success) {
      showToast('Item deleted successfully');
      loadItems();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
