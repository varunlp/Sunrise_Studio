/* ═══════════════════════════════════════════
   SUNRISE HOTEL — Admin Dashboard JavaScript
   ═══════════════════════════════════════════ */

let allBookings = [];
let allAdminRooms = [];

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
});

// ═══════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════
async function checkAuth() {
  try {
    const res = await fetch('/api/admin/me');
    const data = await res.json();
    if (data.loggedIn) {
      showDashboard(data.username);
    }
  } catch (err) {
    // Not logged in, show login page
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  const errorEl = document.getElementById('loginError');

  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  btn.disabled = true;
  errorEl.textContent = '';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed.';
    } else {
      showDashboard(data.username);
      showToast('Welcome back, ' + data.username + '! 🌅', 'success');
    }
  } catch (err) {
    errorEl.textContent = 'Network error. Please try again.';
  } finally {
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    btn.disabled = false;
  }
}

async function logout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
  } catch (err) {}
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
  showToast('Logged out successfully.', 'success');
}

function showDashboard(username) {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  document.getElementById('adminName').textContent = username;
  document.getElementById('welcomeName').textContent = username;
  loadDashboardData();
}

// ═══════════════════════════════════════════
//  DATA LOADING
// ═══════════════════════════════════════════
async function loadDashboardData() {
  await Promise.all([loadStats(), loadBookings(), loadAdminRooms()]);
}

async function refreshData() {
  showToast('Refreshing data...', 'success');
  await loadDashboardData();
}

async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats');
    if (res.status === 401) return logout();
    const stats = await res.json();
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statConfirmed').textContent = stats.confirmed;
    document.getElementById('statRevenue').textContent = '$' + stats.revenue.toLocaleString();
    document.getElementById('availableCount').textContent = stats.availableRooms;
    document.getElementById('totalRoomCount').textContent = stats.totalRooms;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadBookings() {
  try {
    const res = await fetch('/api/admin/bookings');
    if (res.status === 401) return logout();
    allBookings = await res.json();
    renderBookingsTable('overviewBookings', allBookings.slice(0, 10));
    renderBookingsTable('allBookings', allBookings, true);
  } catch (err) {
    console.error('Failed to load bookings:', err);
  }
}

async function loadAdminRooms() {
  try {
    const res = await fetch('/api/admin/rooms');
    if (res.status === 401) return logout();
    allAdminRooms = await res.json();
    renderAdminRooms(allAdminRooms);
  } catch (err) {
    console.error('Failed to load rooms:', err);
  }
}

// ═══════════════════════════════════════════
//  RENDERING
// ═══════════════════════════════════════════
function renderBookingsTable(targetId, bookings, full = false) {
  const tbody = document.getElementById(targetId);

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${full ? 11 : 8}" class="empty-state">No bookings found</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td><strong>${b.reference}</strong></td>
      <td>${b.guest_name}</td>
      ${full ? `<td>${b.guest_email}</td><td>${b.guest_phone}</td>` : ''}
      <td>${b.room_name}</td>
      <td>${formatDate(b.check_in)}</td>
      <td>${formatDate(b.check_out)}</td>
      ${full ? `<td>${b.guests}</td>` : ''}
      <td><strong>$${b.total_price.toLocaleString()}</strong></td>
      <td><span class="status-badge status-${b.status}">${b.status}</span></td>
      <td>
        ${b.status === 'pending' ? `
          <button class="action-btn btn-confirm" onclick="confirmBooking(${b.id})">✓ Confirm</button>
          <button class="action-btn btn-cancel" onclick="cancelBooking(${b.id})">✕ Cancel</button>
        ` : b.status === 'confirmed' ? `
          <button class="action-btn btn-cancel" onclick="cancelBooking(${b.id})">✕ Cancel</button>
        ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">—</span>'}
      </td>
    </tr>
  `).join('');
}

function renderAdminRooms(rooms) {
  const grid = document.getElementById('adminRoomsGrid');
  grid.innerHTML = rooms.map(r => `
    <div class="admin-room-card">
      <div class="admin-room-img">
        <img src="${r.image}" alt="${r.name}" loading="lazy">
      </div>
      <div class="admin-room-info">
        <h4>${r.name}</h4>
        <div class="admin-room-meta">
          <span>📐 ${r.size}</span>
          <span>👥 ${r.capacity} guests</span>
          <span class="status-badge ${r.available ? 'status-confirmed' : 'status-cancelled'}">${r.available ? 'Available' : 'Unavailable'}</span>
        </div>
        <div class="admin-room-footer">
          <span class="admin-room-price">$${r.price} <span>/night</span></span>
          <button class="toggle-btn ${r.available ? 'toggle-available' : 'toggle-unavailable'}" onclick="toggleRoom(${r.id})">
            ${r.available ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════
async function confirmBooking(id) {
  try {
    const res = await fetch(`/api/admin/bookings/${id}/confirm`, { method: 'PUT' });
    if (res.status === 401) return logout();
    const data = await res.json();
    if (res.ok) {
      showToast('Booking confirmed! ✅', 'success');
      await loadDashboardData();
    } else {
      showToast(data.error || 'Failed to confirm.', 'error');
    }
  } catch (err) {
    showToast('Network error.', 'error');
  }
}

async function cancelBooking(id) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;
  try {
    const res = await fetch(`/api/admin/bookings/${id}/cancel`, { method: 'PUT' });
    if (res.status === 401) return logout();
    const data = await res.json();
    if (res.ok) {
      showToast('Booking cancelled.', 'success');
      await loadDashboardData();
    } else {
      showToast(data.error || 'Failed to cancel.', 'error');
    }
  } catch (err) {
    showToast('Network error.', 'error');
  }
}

async function toggleRoom(id) {
  try {
    const res = await fetch(`/api/admin/rooms/${id}/toggle`, { method: 'PUT' });
    if (res.status === 401) return logout();
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, 'success');
      await loadDashboardData();
    } else {
      showToast(data.error || 'Failed to update.', 'error');
    }
  } catch (err) {
    showToast('Network error.', 'error');
  }
}

// ═══════════════════════════════════════════
//  FILTERING
// ═══════════════════════════════════════════
function filterBookings() {
  const status = document.getElementById('statusFilter').value;
  const search = document.getElementById('searchBooking').value.toLowerCase();

  let filtered = allBookings;

  if (status !== 'all') {
    filtered = filtered.filter(b => b.status === status);
  }

  if (search) {
    filtered = filtered.filter(b =>
      b.guest_name.toLowerCase().includes(search) ||
      b.reference.toLowerCase().includes(search) ||
      b.guest_email.toLowerCase().includes(search)
    );
  }

  renderBookingsTable('allBookings', filtered, true);
}

// ═══════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════
function switchTab(tab, el) {
  event.preventDefault();

  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

  document.getElementById('tab-' + tab).classList.add('active');
  el.classList.add('active');

  const titles = {
    overview: 'Dashboard Overview',
    bookings: 'All Bookings',
    rooms: 'Room Management'
  };
  document.getElementById('pageTitle').textContent = titles[tab] || 'Dashboard';
}

// ═══════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.querySelector('.toast-icon').textContent = type === 'success' ? '✓' : '✕';
  toast.querySelector('.toast-msg').textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 4000);
}
