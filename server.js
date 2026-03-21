const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'hotel.db');

// ─── Middleware ───
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Database Setup ───
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    capacity INTEGER NOT NULL,
    size TEXT NOT NULL,
    amenities TEXT NOT NULL,
    image TEXT NOT NULL,
    available INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    room_id INTEGER NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests INTEGER NOT NULL,
    special_requests TEXT,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Seed Data ───
const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
if (roomCount === 0) {
  const insertRoom = db.prepare(`
    INSERT INTO rooms (name, type, description, price, capacity, size, amenities, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rooms = [
    {
      name: 'Ocean View Deluxe',
      type: 'deluxe',
      description: 'Wake up to breathtaking panoramic ocean views in this luxuriously appointed suite. Featuring a private balcony, premium king-size bed, and floor-to-ceiling windows that frame the endless blue horizon.',
      price: 299,
      capacity: 2,
      size: '45 sq m',
      amenities: 'Ocean View,King Bed,Private Balcony,Mini Bar,Free WiFi,Room Service,Smart TV,Rainfall Shower',
      image: '/images/room1.jpg'
    },
    {
      name: 'Royal Presidential Suite',
      type: 'suite',
      description: 'The pinnacle of luxury. This expansive suite features a separate living room, dining area, private jacuzzi, and butler service. Designed for guests who demand nothing but the absolute best.',
      price: 599,
      capacity: 4,
      size: '120 sq m',
      amenities: 'Private Jacuzzi,Butler Service,Living Room,Dining Area,King Bed,Premium Bar,Smart Home,Panoramic View',
      image: '/images/room2.jpg'
    },
    {
      name: 'Garden Retreat Room',
      type: 'standard',
      description: 'A serene escape nestled among lush tropical gardens. This beautifully designed room offers a peaceful ambiance with garden-view terrace, perfect for those seeking tranquility and natural beauty.',
      price: 189,
      capacity: 2,
      size: '35 sq m',
      amenities: 'Garden View,Queen Bed,Terrace,Free WiFi,Mini Fridge,Smart TV,Coffee Maker,Safe Box',
      image: '/images/room3.jpg'
    },
    {
      name: 'Skyline Penthouse',
      type: 'penthouse',
      description: 'Perched on the top floor with 360-degree city views. This stunning penthouse features a rooftop deck, private pool, gourmet kitchen, and the most exclusive amenities available anywhere.',
      price: 899,
      capacity: 6,
      size: '200 sq m',
      amenities: 'Private Pool,Rooftop Deck,360° Views,Gourmet Kitchen,3 Bedrooms,Home Theater,Gym,Concierge',
      image: '/images/room4.jpg'
    },
    {
      name: 'Cozy Classic Room',
      type: 'standard',
      description: 'Elegant simplicity meets modern comfort. Our classic rooms feature premium bedding, a well-appointed workspace, and all the essentials for a comfortable and memorable stay.',
      price: 149,
      capacity: 2,
      size: '30 sq m',
      amenities: 'City View,Double Bed,Work Desk,Free WiFi,Smart TV,Coffee Maker,Iron,Hair Dryer',
      image: '/images/room5.jpg'
    },
    {
      name: 'Family Grand Suite',
      type: 'family',
      description: 'Spacious and thoughtfully designed for families. Featuring interconnected rooms, a kids play corner, and family-friendly amenities that ensure an unforgettable stay for guests of all ages.',
      price: 449,
      capacity: 5,
      size: '85 sq m',
      amenities: 'Connecting Rooms,Kids Corner,2 Bathrooms,Queen+Twin Beds,Game Console,Mini Kitchen,Crib Available,Balcony',
      image: '/images/room6.jpg'
    }
  ];

  const insertMany = db.transaction((rooms) => {
    for (const room of rooms) {
      insertRoom.run(room.name, room.type, room.description, room.price, room.capacity, room.size, room.amenities, room.image);
    }
  });
  insertMany(rooms);
  console.log('✅ Seeded 6 rooms');
}

// Seed admin
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
if (adminCount === 0) {
  const hashedPassword = bcrypt.hashSync('sunrise2026', 10);
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hashedPassword);
  console.log('✅ Seeded admin user (admin / sunrise2026)');
}

// ─── Helper: Generate booking reference ───
function generateRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'SH-';
  for (let i = 0; i < 8; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length));
  return ref;
}

// ─── Auth Middleware ───
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

// ═══════════════════════════════════════════
//  PUBLIC API ROUTES
// ═══════════════════════════════════════════

// GET all rooms
app.get('/api/rooms', (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY price ASC').all();
  const parsed = rooms.map(r => ({
    ...r,
    amenities: r.amenities.split(','),
    available: !!r.available
  }));
  res.json(parsed);
});

// GET single room
app.get('/api/rooms/:id', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  room.amenities = room.amenities.split(',');
  room.available = !!room.available;
  res.json(room);
});

// POST create booking
app.post('/api/bookings', (req, res) => {
  const { roomId, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, specialRequests } = req.body;

  // Validation
  if (!roomId || !guestName || !guestEmail || !guestPhone || !checkIn || !checkOut || !guests) {
    return res.status(400).json({ error: 'All required fields must be filled.' });
  }

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (!room.available) return res.status(400).json({ error: 'Room is not available.' });

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkInDate < today) return res.status(400).json({ error: 'Check-in date cannot be in the past.' });
  if (checkOutDate <= checkInDate) return res.status(400).json({ error: 'Check-out must be after check-in.' });

  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const totalPrice = nights * room.price;
  const reference = generateRef();

  try {
    db.prepare(`
      INSERT INTO bookings (reference, room_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, special_requests, total_price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(reference, roomId, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, specialRequests || '', totalPrice);

    res.status(201).json({
      message: 'Booking created successfully!',
      booking: {
        reference,
        roomName: room.name,
        checkIn,
        checkOut,
        nights,
        guests,
        totalPrice,
        status: 'pending'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  }
});

// GET booking by reference
app.get('/api/bookings/:ref', (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, r.name as room_name, r.type as room_type, r.image as room_image
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    WHERE b.reference = ?
  `).get(req.params.ref);

  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  res.json(booking);
});

// ═══════════════════════════════════════════
//  ADMIN API ROUTES
// ═══════════════════════════════════════════

// POST admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  req.session.adminId = admin.id;
  req.session.adminUsername = admin.username;
  res.json({ message: 'Login successful', username: admin.username });
});

// POST admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// GET admin session check
app.get('/api/admin/me', (req, res) => {
  if (req.session && req.session.adminId) {
    res.json({ loggedIn: true, username: req.session.adminUsername });
  } else {
    res.json({ loggedIn: false });
  }
});

// GET all bookings (admin)
app.get('/api/admin/bookings', requireAdmin, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, r.name as room_name, r.type as room_type, r.price as room_price
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    ORDER BY b.created_at DESC
  `).all();
  res.json(bookings);
});

// PUT confirm booking
app.put('/api/admin/bookings/:id/confirm', requireAdmin, (req, res) => {
  const result = db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('confirmed', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ message: 'Booking confirmed.' });
});

// PUT cancel booking
app.put('/api/admin/bookings/:id/cancel', requireAdmin, (req, res) => {
  const result = db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('cancelled', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ message: 'Booking cancelled.' });
});

// GET admin stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
  const pending = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'").get().count;
  const confirmed = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'").get().count;
  const cancelled = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled'").get().count;
  const revenue = db.prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status = 'confirmed'").get().total;
  const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  const availableRooms = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE available = 1').get().count;

  res.json({ total, pending, confirmed, cancelled, revenue, totalRooms, availableRooms });
});

// PUT toggle room availability
app.put('/api/admin/rooms/:id/toggle', requireAdmin, (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  const newState = room.available ? 0 : 1;
  db.prepare('UPDATE rooms SET available = ? WHERE id = ?').run(newState, req.params.id);
  res.json({ message: `Room ${newState ? 'enabled' : 'disabled'}.`, available: !!newState });
});

// GET all rooms (admin)
app.get('/api/admin/rooms', requireAdmin, (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY id ASC').all();
  const parsed = rooms.map(r => ({
    ...r,
    amenities: r.amenities.split(','),
    available: !!r.available
  }));
  res.json(parsed);
});

// ─── Catch-all: serve index.html ───
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ─── Start Server ───
app.listen(PORT, () => {
  console.log(`\n🌅 Sunrise Hotel Server running at http://localhost:${PORT}`);
  console.log(`📋 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`🔑 Admin Login: admin / sunrise2026\n`);
});
