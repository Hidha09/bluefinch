/**
 * Application Main Controller & View Router
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initEventListeners();
  
  // Initial Data Load
  loadDashboard();
  loadPOList();
  loadSuppliers();
  loadItems();
});

// View Navigation & Router
function showView(viewId) {
  // Hide all views
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });

  // Deactivate all sidebar links
  document.querySelectorAll('.menu-link, .submenu-link').forEach(link => {
    link.classList.remove('active');
  });

  // Activate target view
  const targetView = document.getElementById(`${viewId}-view`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Highlight corresponding link
  const targetLink = document.querySelector(`[data-view="${viewId}"]`);
  if (targetLink) {
    targetLink.classList.add('active');
  }

  // Update Page Title
  const titleEl = document.getElementById('current-page-title');
  const subEl = document.getElementById('current-page-subtitle');

  switch (viewId) {
    case 'dashboard':
      titleEl.textContent = 'Purchase Dashboard';
      subEl.textContent = 'Overview of purchasing operations and purchase order tracking';
      loadDashboard();
      break;
    case 'po-list':
      titleEl.textContent = 'Purchase Orders';
      subEl.textContent = 'Manage existing purchase orders, view status, or create new orders';
      loadPOList();
      break;
    case 'po-form':
      titleEl.textContent = 'Purchase Order Form';
      subEl.textContent = 'Create or modify purchase order details and line items';
      break;
    case 'suppliers':
      titleEl.textContent = 'Supplier Master';
      subEl.textContent = 'Manage registered vendor details, tax numbers, and contact records';
      loadSuppliers();
      break;
    case 'items':
      titleEl.textContent = 'Item Master';
      subEl.textContent = 'Manage product items, categories, pricing, and default taxes';
      loadItems();
      break;
  }
}

// Navigation & Sidebar Handlers
function initNavigation() {
  // Click on menu links
  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      showView(view);
    });
  });

  // Expandable Masters Menu Toggle
  const toggleMastersBtn = document.getElementById('toggle-masters');
  const mastersMenu = document.getElementById('menu-masters');
  if (toggleMastersBtn && mastersMenu) {
    toggleMastersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      mastersMenu.classList.toggle('open');
    });
  }
}

// Global Event Listeners
function initEventListeners() {
  // PO List Buttons & Filters
  document.getElementById('btn-open-create-po')?.addEventListener('click', () => {
    openCreatePOForm();
  });

  document.getElementById('po-search-input')?.addEventListener('input', () => {
    loadPOList();
  });

  document.getElementById('po-status-filter')?.addEventListener('change', () => {
    loadPOList();
  });

  // PO Form Actions
  document.getElementById('btn-add-item-row')?.addEventListener('click', () => {
    addPOItemRow();
  });

  document.getElementById('btn-cancel-po')?.addEventListener('click', () => {
    showView('po-list');
  });

  document.getElementById('btn-cancel-po-top')?.addEventListener('click', () => {
    showView('po-list');
  });

  document.getElementById('btn-save-draft')?.addEventListener('click', () => {
    savePO('Draft');
  });

  document.getElementById('po-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    savePO('Pending');
  });

  document.getElementById('po-additional-charges')?.addEventListener('input', () => {
    calculatePOSummary();
  });

  // Supplier Master Actions
  document.getElementById('btn-open-add-supplier')?.addEventListener('click', () => {
    openAddSupplierModal();
  });

  document.getElementById('supplier-search-input')?.addEventListener('input', (e) => {
    loadSuppliers(e.target.value);
  });

  document.getElementById('supplier-form')?.addEventListener('submit', handleSupplierSubmit);

  document.querySelectorAll('.close-supplier-modal').forEach(btn => {
    btn.addEventListener('click', closeSupplierModal);
  });

  // Item Master Actions
  document.getElementById('btn-open-add-item')?.addEventListener('click', () => {
    openAddItemModal();
  });

  document.getElementById('item-search-input')?.addEventListener('input', (e) => {
    loadItems(e.target.value);
  });

  document.getElementById('item-form')?.addEventListener('submit', handleItemSubmit);

  document.querySelectorAll('.close-item-modal').forEach(btn => {
    btn.addEventListener('click', closeItemModal);
  });

  // Item Picker Modal Actions
  document.querySelectorAll('.close-picker').forEach(btn => {
    btn.addEventListener('click', closeItemPickerModal);
  });

  document.getElementById('picker-search-input')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = itemsCache.filter(i => 
      i.item_code.toLowerCase().includes(q) ||
      i.item_name.toLowerCase().includes(q) ||
      (i.category && i.category.toLowerCase().includes(q))
    );
    renderPickerItems(filtered);
  });

  // View PO Modal Close
  document.querySelectorAll('.close-view-po').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('modal-view-po').classList.remove('show');
    });
  });

  // Close modals when clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('show');
      }
    });
  });
}
