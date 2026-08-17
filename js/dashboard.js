/**
 * Dashboard View Handler
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
  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
  }
}

function renderPOStatusChart(data) {
  const ctx = document.getElementById('poStatusChart');
  if (!ctx) return;

  if (statusChartInstance) {
    statusChartInstance.destroy();
  }

  const chartData = {
    labels: ['Draft POs', 'Pending POs', 'Completed POs'],
    datasets: [{
      data: [data.draft_pos || 0, data.pending_pos || 0, data.completed_pos || 0],
      backgroundColor: [
        '#f59e0b', // Draft Amber
        '#0284c7', // Pending Blue
        '#16a34a'  // Completed Green
      ],
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6
    }]
  };

  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Inter', size: 12, weight: '500' },
            padding: 16,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}
