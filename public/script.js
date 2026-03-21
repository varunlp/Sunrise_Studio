/* ═══════════════════════════════════════════
   SUNRISE HOTEL — Guest Frontend JavaScript
   ═══════════════════════════════════════════ */

// ─── Global State ───
let allRooms = [];
let selectedRoom = null;
let currentModalRoom = null;

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHamburger();
  initParticles();
  initScrollAnimations();
  initCounters();
  loadRooms();
  initBookingForm();
  setMinDates();
});

// ═══════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    // Sticky navbar
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active link highlight
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 150;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  });
}

function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('active');
  });

  // Close menu on link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
    });
  });
}

function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// ═══════════════════════════════════════════
//  HERO PARTICLES
// ═══════════════════════════════════════════
function initParticles() {
  const container = document.getElementById('heroParticles');
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'hero-particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (4 + Math.random() * 4) + 's';
    particle.style.width = (2 + Math.random() * 3) + 'px';
    particle.style.height = particle.style.width;
    container.appendChild(particle);
  }
}

// ═══════════════════════════════════════════
//  SCROLL ANIMATIONS
// ═══════════════════════════════════════════
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.getAttribute('data-delay') || 0;
        setTimeout(() => {
          entry.target.classList.add('animated');
        }, parseInt(delay));
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════
//  COUNTER ANIMATION
// ═══════════════════════════════════════════
function initCounters() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute('data-count'));
        animateCounter(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-number').forEach(el => observer.observe(el));
}

function animateCounter(el, target) {
  let current = 0;
  const increment = target / 60;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.textContent = target;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current);
    }
  }, 25);
}

// ═══════════════════════════════════════════
//  ROOMS
// ═══════════════════════════════════════════
async function loadRooms() {
  try {
    const res = await fetch('/api/rooms');
    allRooms = await res.json();
    renderRooms(allRooms);
  } catch (err) {
    document.getElementById('roomsGrid').innerHTML = `
      <div class="rooms-loading">
        <p style="color: var(--danger)">Failed to load rooms. Please refresh the page.</p>
      </div>
    `;
  }
}

function renderRooms(rooms) {
  const grid = document.getElementById('roomsGrid');
  grid.innerHTML = rooms.map(room => `
    <div class="room-card" data-animate="fade-up" onclick="openRoomModal(${room.id})">
      <div class="room-card-image">
        <img src="${room.image}" alt="${room.name}" loading="lazy">
        <span class="room-card-badge">${room.type}</span>
        <span class="room-card-price">$${room.price}<span>/night</span></span>
      </div>
      <div class="room-card-content">
        <h3 class="room-card-title">${room.name}</h3>
        <p class="room-card-desc">${room.description}</p>
        <div class="room-card-meta">
          <span class="room-meta-item">👥 ${room.capacity} guests</span>
          <span class="room-meta-item">📐 ${room.size}</span>
        </div>
        <div class="room-card-amenities">
          ${room.amenities.slice(0, 4).map(a => `<span class="amenity-tag">${a.trim()}</span>`).join('')}
          ${room.amenities.length > 4 ? `<span class="amenity-tag">+${room.amenities.length - 4} more</span>` : ''}
        </div>
        <div class="room-card-actions">
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openRoomModal(${room.id})">View Details</button>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); selectRoomAndBook(${room.id})">Book Now</button>
        </div>
      </div>
    </div>
  `).join('');

  // Re-observe new elements for animation
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
      }
    });
  }, { threshold: 0.1 });

  grid.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

  // Populate room select in booking form
  populateRoomSelect(rooms);
}

function populateRoomSelect(rooms) {
  const select = document.getElementById('roomSelect');
  const options = rooms.filter(r => r.available).map(r =>
    `<option value="${r.id}">🏨 ${r.name} — $${r.price}/night (up to ${r.capacity} guests)</option>`
  ).join('');
  select.innerHTML = '<option value="">-- Select a room --</option>' + options;
}

// ═══════════════════════════════════════════
//  ROOM MODAL
// ═══════════════════════════════════════════
function openRoomModal(id) {
  const room = allRooms.find(r => r.id === id);
  if (!room) return;
  currentModalRoom = room;

  document.getElementById('modalImage').src = room.image;
  document.getElementById('modalType').textContent = room.type;
  document.getElementById('modalTitle').textContent = room.name;
  document.getElementById('modalDesc').textContent = room.description;
  document.getElementById('modalPrice').textContent = room.price;
  document.getElementById('modalCapacity').textContent = room.capacity;
  document.getElementById('modalSize').textContent = room.size;

  document.getElementById('modalAmenities').innerHTML = room.amenities.map(
    a => `<span class="amenity-tag">${a.trim()}</span>`
  ).join('');

  const modal = document.getElementById('roomModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('roomModal').classList.remove('active');
  document.body.style.overflow = '';
}

function bookThisRoom() {
  if (currentModalRoom) {
    closeModal();
    selectRoomAndBook(currentModalRoom.id);
  }
}

// Close modal on overlay click
document.getElementById('roomModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// Close modal on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ═══════════════════════════════════════════
//  BOOKING
// ═══════════════════════════════════════════
function selectRoomAndBook(id) {
  document.getElementById('roomSelect').value = id;
  handleRoomSelect();
  scrollToSection('booking');
}

function setMinDates() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('checkIn').min = today;
  document.getElementById('checkOut').min = today;
}

function handleRoomSelect() {
  const roomId = parseInt(document.getElementById('roomSelect').value);
  selectedRoom = allRooms.find(r => r.id === roomId) || null;

  const preview = document.getElementById('selectedRoomPreview');
  if (selectedRoom) {
    document.getElementById('previewImg').src = selectedRoom.image;
    document.getElementById('previewName').textContent = selectedRoom.name;
    document.getElementById('previewPrice').textContent = `$${selectedRoom.price} / night`;
    preview.style.display = 'flex';
  } else {
    preview.style.display = 'none';
  }
  updatePriceSummary();
}

function updatePriceSummary() {
  const summary = document.getElementById('priceSummary');
  const checkIn = document.getElementById('checkIn').value;
  const checkOut = document.getElementById('checkOut').value;

  if (!selectedRoom || !checkIn || !checkOut) {
    summary.style.display = 'none';
    return;
  }

  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  if (nights <= 0) {
    summary.style.display = 'none';
    return;
  }

  const total = nights * selectedRoom.price;
  document.getElementById('summaryRoom').textContent = selectedRoom.name;
  document.getElementById('summaryPerNight').textContent = `$${selectedRoom.price}`;
  document.getElementById('summaryNights').textContent = nights;
  document.getElementById('summaryTotal').textContent = `$${total.toLocaleString()}`;
  summary.style.display = 'block';
}

function initBookingForm() {
  const form = document.getElementById('bookingForm');
  const roomSelect = document.getElementById('roomSelect');
  const checkIn = document.getElementById('checkIn');
  const checkOut = document.getElementById('checkOut');

  roomSelect.addEventListener('change', handleRoomSelect);
  checkIn.addEventListener('change', () => {
    if (checkIn.value) {
      const nextDay = new Date(checkIn.value);
      nextDay.setDate(nextDay.getDate() + 1);
      checkOut.min = nextDay.toISOString().split('T')[0];
      if (checkOut.value && checkOut.value <= checkIn.value) {
        checkOut.value = nextDay.toISOString().split('T')[0];
      }
    }
    updatePriceSummary();
  });
  checkOut.addEventListener('change', updatePriceSummary);

  form.addEventListener('submit', handleBookingSubmit);
}

async function handleBookingSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('bookBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');

  // Loading state
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline-flex';
  btn.disabled = true;

  const data = {
    roomId: parseInt(document.getElementById('roomSelect').value),
    guestName: document.getElementById('guestName').value.trim(),
    guestEmail: document.getElementById('guestEmail').value.trim(),
    guestPhone: document.getElementById('guestPhone').value.trim(),
    checkIn: document.getElementById('checkIn').value,
    checkOut: document.getElementById('checkOut').value,
    guests: parseInt(document.getElementById('guests').value),
    specialRequests: document.getElementById('specialRequests').value.trim()
  };

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      showToast(result.error || 'Booking failed.', 'error');
      return;
    }

    // Show confirmation
    document.getElementById('confRef').textContent = result.booking.reference;
    document.getElementById('confRoom').textContent = result.booking.roomName;
    document.getElementById('confCheckIn').textContent = formatDate(result.booking.checkIn);
    document.getElementById('confCheckOut').textContent = formatDate(result.booking.checkOut);
    document.getElementById('confGuests').textContent = result.booking.guests;
    document.getElementById('confTotal').textContent = `$${result.booking.totalPrice.toLocaleString()}`;

    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('bookingConfirmation').style.display = 'block';

    showToast('Booking created successfully! 🎉', 'success');

  } catch (err) {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    btn.disabled = false;
  }
}

function resetBooking() {
  document.getElementById('bookingForm').style.display = 'block';
  document.getElementById('bookingConfirmation').style.display = 'none';
  document.getElementById('bookingForm').reset();
  document.getElementById('selectedRoomPreview').style.display = 'none';
  document.getElementById('priceSummary').style.display = 'none';
  selectedRoom = null;
}

// ═══════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.querySelector('.toast-icon').textContent = type === 'success' ? '✓' : '✕';
  toast.querySelector('.toast-message').textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
