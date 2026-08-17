/**
 * Main Enterprise ERP Router & Application Coordinator
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

function showView(viewId) {
  // Hide all views
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });

  // Reset active menu states
  document.querySelectorAll('.menu-link, .submenu-link').forEach(link => {
    link.classList.remove('active');
  });

  // Activate target view
  const targetView = document.getElementById(`${viewId}-view`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Highlight active link
  const targetLink = document.querySelector(`[data-view="${viewId}"]`);
  if (targetLink) {
    targetLink.classList.add('active');
    // If inside submenu, open parent menu
    const parentSubmenu = targetLink.closest('.menu-item.has-submenu');
    if (parentSubmenu) {
      parentSubmenu.classList.add('open');
    }
  }

  // Update Breadcrumbs & Header Title
  const titleEl = document.getElementById('current-page-title');
  const breadcrumbEl = document.getElementById('breadcrumb-current');

  switch (viewId) {
    case 'dashboard':
      if (titleEl) titleEl.textContent = 'Purchase Dashboard';
      if (breadcrumbEl) breadcrumbEl.textContent = 'Dashboard';
      loadDashboard();
      break;
    case 'po-list':
      if (titleEl) titleEl.textContent = 'Purchase Orders';
      if (breadcrumbEl) breadcrumbEl.textContent = 'Purchase Orders';
      loadPOList();
      break;
    case 'po-form':
      if (titleEl) titleEl.textContent = 'Create Purchase Order';
      if (breadcrumbEl) breadcrumbEl.textContent = 'New Purchase Order';
      break;
    case 'suppliers':
      if (titleEl) titleEl.textContent = 'Supplier Master';
      if (breadcrumbEl) breadcrumbEl.textContent = 'Suppliers';
      loadSuppliers();
      break;
    case 'items':
      if (titleEl) titleEl.textContent = 'Item Master';
      if (breadcrumbEl) breadcrumbEl.textContent = 'Items';
      loadItems();
      break;
  }
}

function initNavigation() {
  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      showView(view);
    });
  });

  const toggleMastersBtn = document.getElementById('toggle-masters');
  const mastersMenu = document.getElementById('menu-masters');
  if (toggleMastersBtn && mastersMenu) {
    toggleMastersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      mastersMenu.classList.toggle('open');
    });
  }
}

function initEventListeners() {
  // PO List Buttons
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

  // Item Picker Actions
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
