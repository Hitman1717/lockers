import { Router } from 'express';
import dataStore from '../services/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/reports/events
router.get('/events', authenticateToken, (req, res) => {
  const { lockerId, limit = 50 } = req.query;
  let events = dataStore.getEvents(parseInt(limit, 10));

  if (lockerId) {
    events = events.filter((e) => String(e.lockerId) === String(lockerId));
  }

  res.json({
    total: events.length,
    events
  });
});

// GET /api/reports/occupancy
router.get('/occupancy', authenticateToken, (req, res) => {
  const lockers = dataStore.getLockers();
  const total = lockers.length;
  const occupied = lockers.filter((l) => l.status === 'occupied').length;
  const available = lockers.filter((l) => l.status === 'available').length;
  const maintenance = lockers.filter((l) => l.status === 'maintenance').length;
  const unlocked = lockers.filter((l) => l.status === 'unlocked').length;

  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  // Breakdown by ward
  const wardsBreakdown = dataStore.wards.map((ward) => {
    const wardLockers = lockers.filter((l) => l.wardId === ward.id);
    const wardOccupied = wardLockers.filter((l) => l.status === 'occupied').length;
    return {
      wardId: ward.id,
      wardName: ward.name,
      total: wardLockers.length,
      occupied: wardOccupied,
      available: wardLockers.filter((l) => l.status === 'available').length,
      occupancyRate: wardLockers.length > 0 ? Math.round((wardOccupied / wardLockers.length) * 100) : 0
    };
  });

  res.json({
    total,
    occupied,
    available,
    maintenance,
    unlocked,
    occupancyRatePercentage: rate,
    wards: wardsBreakdown
  });
});

export default router;
