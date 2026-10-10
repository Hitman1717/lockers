import { Router } from 'express';
import dataStore from '../services/store.js';
import mqttService from '../services/mqtt.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// GET /api/hierarchy - Returns full tree
router.get('/hierarchy', authenticateToken, (req, res) => {
  const hierarchy = dataStore.getHierarchy();
  res.json(hierarchy);
});

// POST /api/hierarchy/companies - Super admin only
router.post('/hierarchy/companies', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Company name is required' });
  const comp = dataStore.addCompany(name);
  dataStore.logEvent('SYSTEM', 'COMPANY_CREATED', { name });
  res.status(201).json(comp);
});

// POST /api/hierarchy/branches - Super admin only
router.post('/hierarchy/branches', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { cityId, name, address } = req.body;
  if (!cityId || !name) return res.status(400).json({ error: 'cityId and name are required' });
  const branch = dataStore.addBranch(cityId, name, address || '');
  dataStore.logEvent('SYSTEM', 'BRANCH_CREATED', { name, cityId });
  res.status(201).json(branch);
});

// POST /api/hierarchy/wards - Super admin or Branch admin
router.post('/hierarchy/wards', authenticateToken, authorizeRoles('super_admin', 'branch_admin'), (req, res) => {
  const { branchId, name, floor } = req.body;
  if (!branchId || !name) return res.status(400).json({ error: 'branchId and name are required' });

  // If branch_admin, ensure they only create in their own branch
  if (req.user.role === 'branch_admin' && req.user.branchId !== parseInt(branchId, 10)) {
    return res.status(403).json({ error: 'Cannot create ward outside assigned branch' });
  }

  const ward = dataStore.addWard(branchId, name, floor || '');
  dataStore.logEvent('SYSTEM', 'WARD_CREATED', { name, branchId });
  res.status(201).json(ward);
});

// GET /api/lockers - List lockers
router.get('/lockers', (req, res) => {
  const { wardId } = req.query;
  const lockers = dataStore.getLockers(wardId);
  res.json(lockers);
});

// POST /api/lockers - Add a locker
router.post('/lockers', authenticateToken, authorizeRoles('super_admin', 'branch_admin'), (req, res) => {
  const { wardId, lockerNumber } = req.body;
  if (!wardId || !lockerNumber) return res.status(400).json({ error: 'wardId and lockerNumber are required' });

  const locker = dataStore.addLocker(wardId, lockerNumber);
  dataStore.logEvent(locker.id, 'LOCKER_CREATED', { lockerNumber, wardId });
  res.status(201).json(locker);
});

// POST /api/lockers/:id/unlock - Manual Override / Unlock
router.post('/lockers/:id/unlock', authenticateToken, authorizeRoles('super_admin', 'branch_admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const locker = dataStore.getLockerById(id);
  if (!locker) {
    return res.status(404).json({ error: 'Locker not found' });
  }

  const reason = req.body.reason || 'Manual Admin/Staff Override';
  try {
    await mqttService.sendUnlockCommand(locker.id, {
      requestedBy: req.user.email,
      role: req.user.role,
      reason
    });

    dataStore.logEvent(locker.id, 'MANUAL_OVERRIDE_UNLOCK', {
      user: req.user.email,
      role: req.user.role,
      reason
    });

    res.json({
      message: `Unlock command dispatched for Locker ${locker.lockerNumber}`,
      locker: dataStore.getLockerById(locker.id)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send unlock command', details: err.message });
  }
});

// PATCH /api/lockers/:id/status - Update locker state (e.g. maintenance)
router.patch('/lockers/:id/status', authenticateToken, authorizeRoles('super_admin', 'branch_admin', 'staff'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['available', 'occupied', 'unlocked', 'maintenance', 'offline'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const updated = dataStore.updateLocker(id, { status });
  if (!updated) return res.status(404).json({ error: 'Locker not found' });

  dataStore.logEvent(updated.id, 'STATUS_CHANGE', {
    newStatus: status,
    changedBy: req.user.email
  });

  if (mqttService.io) {
    mqttService.io.emit('locker:update', updated);
  }

  res.json(updated);
});

// GET /api/lockers/summary - Ward locker summary
router.get('/lockers/summary', (req, res) => {
  const lockers = dataStore.getLockers();
  const summary = {
    total: lockers.length,
    available: lockers.filter((l) => l.status === 'available').length,
    occupied: lockers.filter((l) => l.status === 'occupied').length,
    unlocked: lockers.filter((l) => l.status === 'unlocked').length,
    maintenance: lockers.filter((l) => l.status === 'maintenance').length,
    offline: lockers.filter((l) => l.status === 'offline').length
  };
  res.json(summary);
});

export default router;
