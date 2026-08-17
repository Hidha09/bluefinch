/**
 * Enterprise Dashboard View Handler
 */
let statusChartInstance = null;

async function loadDashboard() {
  try {
    const res = await API.get('dashboard.php');
    if (!res.success) return;

    const data = res.data;
    document.getElementById('stat-total-pos').textContent = data.total_pos || 0;
    document.getElementById('stat-draft-pos').textContent = data.draft_pos || 0;
    document.getElementById('stat-pending-pos').textContent = data.pending_pos || 0;
    document.getElementById('stat-completed-pos').textContent = data.completed_pos || 0;

    renderPOStatusChart(data);
    loadRecentPOTable();
  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
  }
}

async function loadRecentPOTable() {
  const tbody = document.getElementById('dashboard-recent-po-body');
  if (!tbody) return;

  try {
    const res = await API.get('purchase_orders.php');
    if (res.success && res.data) {
      const recentOrders = res.data.slice(0, 5); // top 5 recent orders

      if (recentOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No recent purchase orders.</td></tr>`;
        return;
      }

      tbody.innerHTML = recentOrders.map(po => {
        let statusBadge = 'badge-draft';
        const st = (po.status || 'Draft').toLowerCase();
        if (st === 'pending' || st === 'submitted') statusBadge = 'badge-pending';
        else if (st === 'completed') statusBadge = 'badge-completed';
        else if (st === 'cancelled') statusBadge = 'badge-cancelled';

        return `
          <tr>
            <td><strong style="color: var(--primary);">${escapeHtml(po.po_number || '')}</strong></td>
            <td>${escapeHtml(po.po_date || '')}</td>
            <td><strong>${escapeHtml(po.supplier_name || '')}</strong></td>
            <td><strong>$${parseFloat(po.grand_total || 0).toFixed(2)}</strong></td>
            <td><span class="badge ${statusBadge}">${escapeHtml(po.status || 'Draft')}</span></td>
            <td style="text-align: right;">
              <button class="btn-icon view" onclick="viewPODetails(${po.id})" title="View Details"><i class="fa-solid fa-eye"></i></button>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load recent POs:', err);
  }
}

function renderPOStatusChart(data) {
  const ctx = document.getElementById('poStatusChart');
  if (!ctx) return;

  if (statusChartInstance) {
    statusChartInstance.destroy();
  }

  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Draft', 'Pending', 'Completed'],
      datasets: [{
        data: [data.draft_pos || 0, data.pending_pos || 0, data.completed_pos || 0],
        backgroundColor: [
          '#94a3b8', // Gray (Draft)
          '#f59e0b', // Amber (Pending)
          '#0f766e'  // Enterprise Teal (Completed)
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Inter', size: 12, weight: '500' },
            padding: 14,
            usePointStyle: true
          }
        }
      },
      cutout: '70%'
    }
  });
}
