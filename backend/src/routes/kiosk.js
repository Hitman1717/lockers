import { Router } from 'express';
import dataStore from '../services/store.js';
import mqttService from '../services/mqtt.js';
import { saveSnapshot, deleteLockerSnapshot, cleanAllSnapshots } from '../services/snapshotService.js';

const router = Router();

// GET /api/kiosk/config
router.get('/config', (req, res) => {
  const wardId = parseInt(req.query.wardId || '1', 10);
  const ward = dataStore.wards.find((w) => w.id === wardId) || dataStore.wards[0];
  const branch = dataStore.branches.find((b) => b.id === (ward ? ward.branchId : 1));
  const lockers = dataStore.getLockers(ward ? ward.id : null);

  const availableCount = lockers.filter((l) => l.status === 'available').length;

  res.json({
    branch: branch ? branch.name : 'Unknown Branch',
    ward: ward ? ward.name : 'Main Ward',
    wardId: ward ? ward.id : 1,
    floor: ward ? ward.floor : 'Ground',
    availableCount,
    totalLockers: lockers.length,
    lockers: lockers.map((l) => ({
      id: l.id,
      lockerNumber: l.lockerNumber,
      status: l.status,
      occupantName: l.occupantName
    }))
  });
});

// POST /api/kiosk/register
router.post('/register', async (req, res) => {
  const { name, phone, pin, photo, wardId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required to assign a locker.' });
  }

  const targetWardId = parseInt(wardId || '1', 10);
  const wardLockers = dataStore.getLockers(targetWardId);
  const availableLocker = wardLockers.find((l) => l.status === 'available');

  if (!availableLocker) {
    return res.status(409).json({
      error: 'No lockers are currently available in this ward. Please speak with staff.'
    });
  }

  // Save photo snapshot to local folder in kiosk-app
  let localPhotoUrl = null;
  if (photo) {
    localPhotoUrl = saveSnapshot(availableLocker.lockerNumber, photo);
  }

  // Update locker data
  const updatedLocker = dataStore.updateLocker(availableLocker.id, {
    status: 'unlocked',
    pin: pin ? String(pin).trim() : null,
    occupantName: name.trim(),
    occupantPhone: phone || 'N/A',
    occupantPhoto: localPhotoUrl || photo || null
  });

  // Log event
  dataStore.logEvent(availableLocker.id, 'KIOSK_REGISTRATION', {
    occupantName: name,
    occupantPhone: phone,
    wardId: targetWardId,
    timestamp: new Date().toISOString()
  });

  // Dispatch hardware unlock command via MQTT
  try {
    await mqttService.sendUnlockCommand(availableLocker.id, {
      action: 'unlock',
      trigger: 'kiosk_registration',
      occupant: name
    });
  } catch (err) {
    console.error('[Kiosk] Error dispatching unlock command:', err.message);
  }

  res.json({
    success: true,
    message: `Locker ${availableLocker.lockerNumber} allocated and unlocked! Please deposit your belongings.`,
    locker: {
      id: availableLocker.id,
      lockerNumber: availableLocker.lockerNumber,
      status: 'unlocked'
    }
  });
});

// POST /api/kiosk/release
router.post('/release', async (req, res) => {
  const { lockerNumber, pin } = req.body;

  if (!lockerNumber || !lockerNumber.trim()) {
    return res.status(400).json({ error: 'Locker number is required.' });
  }

  const locker = dataStore.getLockerById(lockerNumber.trim());
  if (!locker) {
    return res.status(404).json({ error: `Locker ${lockerNumber} not found.` });
  }

  if (locker.status !== 'occupied' && locker.status !== 'unlocked') {
    return res.status(400).json({ error: `Locker ${lockerNumber} is not currently occupied.` });
  }

  // If a PIN was configured and user provided a pin, verify it
  if (locker.pin && pin && String(locker.pin) !== String(pin).trim()) {
    return res.status(401).json({ error: 'Incorrect PIN. Please re-enter or ask hospital staff.' });
  }

  const previousOccupant = locker.occupantName;

  // Erase local snapshot image for this locker upon release
  if (locker.occupantPhoto) {
    deleteLockerSnapshot(locker.occupantPhoto);
  }

  // Clear locker occupancy and unlock
  dataStore.updateLocker(locker.id, {
    status: 'unlocked',
    pin: null,
    occupantName: null,
    occupantPhone: null,
    occupantPhoto: null
  });

  // Log event
  dataStore.logEvent(locker.id, 'KIOSK_RELEASE', {
    releasedBy: previousOccupant,
    lockerNumber: locker.lockerNumber,
    timestamp: new Date().toISOString()
  });

  // Dispatch unlock command with isRelease flag
  try {
    await mqttService.sendUnlockCommand(locker.id, {
      action: 'unlock',
      isRelease: true,
      trigger: 'kiosk_release',
      occupant: previousOccupant
    });
  } catch (err) {
    console.error('[Kiosk] Error dispatching release unlock:', err.message);
  }

  res.json({
    success: true,
    message: `Locker ${locker.lockerNumber} has been unlocked. Please retrieve your items. Thank you!`,
    lockerNumber: locker.lockerNumber
  });
});

// POST /api/kiosk/cleanup-snapshots (triggered on app close / unload / purge)
router.post('/cleanup-snapshots', (req, res) => {
  cleanAllSnapshots();
  res.json({ success: true, message: 'All local kiosk snapshots erased.' });
});

export default router;
