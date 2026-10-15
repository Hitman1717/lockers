import { Router } from 'express';
import dataStore from '../services/store.js';
import mqttService from '../services/mqtt.js';
import {
  saveLockerBiometrics,
  getLockerBiometrics,
  getAllLockersStorageSummary,
  releaseLockerFiles,
  cleanAllSnapshots
} from '../services/snapshotService.js';

const router = Router();

// GET /api/kiosk/config - Terminal config and active lockers 1..10
router.get('/config', (req, res) => {
  const wardId = parseInt(req.query.wardId || '1', 10);
  const ward = dataStore.wards.find((w) => w.id === wardId) || dataStore.wards[0];
  const branch = dataStore.branches.find((b) => b.id === (ward ? ward.branchId : 1));
  const lockers = dataStore.getLockers(ward ? ward.id : null);

  const availableCount = lockers.filter((l) => l.status === 'available').length;

  res.json({
    branch: branch ? branch.name : 'Central Memorial Hospital',
    ward: ward ? ward.name : 'Ward 3A - Intensive Care',
    wardId: ward ? ward.id : 1,
    floor: ward ? ward.floor : '3rd Floor',
    availableCount,
    totalLockers: lockers.length,
    lockers: lockers.map((l) => ({
      id: l.id,
      lockerNumber: l.lockerNumber,
      folderName: l.folderName || `locker${l.id}`,
      status: l.status,
      occupantName: l.occupantName,
      occupantPhoto: l.occupantPhoto,
      batteryLevel: l.batteryLevel
    }))
  });
});

// GET /api/kiosk/lockers-info - Storage audit of all 10 lockers (images & .npy embeddings)
router.get('/lockers-info', (req, res) => {
  const summary = getAllLockersStorageSummary();
  res.json({
    totalLockers: 10,
    lockers: summary
  });
});

// GET /api/kiosk/lockers/:id/biometrics - Detailed files & 512-dim embedding inspection
router.get('/lockers/:id/biometrics', (req, res) => {
  const { id } = req.params;
  const biometrics = getLockerBiometrics(id);
  const locker = dataStore.getLockerById(id);

  res.json({
    ...biometrics,
    lockerNumber: locker ? locker.lockerNumber : `Locker ${id}`,
    status: locker ? locker.status : 'unknown',
    occupantName: locker ? locker.occupantName : null
  });
});

// POST /api/kiosk/register - Check in user, allocate locker (1..10), store images & .npy embeddings
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

  // Save image and 512-dim embedding .npy into locker's specific folder (both backend & frontend public)
  let savedBio = null;
  if (photo) {
    savedBio = saveLockerBiometrics(availableLocker.id, photo);
  }

  // Update locker data
  const updatedLocker = dataStore.updateLocker(availableLocker.id, {
    status: 'unlocked',
    pin: pin ? String(pin).trim() : null,
    occupantName: name.trim(),
    occupantPhone: phone || 'N/A',
    occupantPhoto: savedBio ? savedBio.imageUrl : (photo || null)
  });

  // Log event
  dataStore.logEvent(availableLocker.id, 'KIOSK_REGISTRATION', {
    occupantName: name,
    occupantPhone: phone,
    wardId: targetWardId,
    folderName: availableLocker.folderName,
    embeddingStored: Boolean(savedBio),
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
    message: `${availableLocker.lockerNumber} allocated and unlocked! Please deposit your belongings.`,
    locker: {
      id: availableLocker.id,
      lockerNumber: availableLocker.lockerNumber,
      folderName: availableLocker.folderName,
      status: 'unlocked',
      imageUrl: savedBio ? savedBio.imageUrl : null,
      embeddingUrl: savedBio ? savedBio.embeddingUrl : null
    }
  });
});

// POST /api/kiosk/release - Unlock and release locker
router.post('/release', async (req, res) => {
  const { lockerNumber, pin } = req.body;

  if (!lockerNumber || !String(lockerNumber).trim()) {
    return res.status(400).json({ error: 'Locker identifier is required.' });
  }

  const locker = dataStore.getLockerById(String(lockerNumber).trim());
  if (!locker) {
    return res.status(404).json({ error: `Locker "${lockerNumber}" not found.` });
  }

  if (locker.status !== 'occupied' && locker.status !== 'unlocked') {
    return res.status(400).json({ error: `${locker.lockerNumber} is not currently occupied.` });
  }

  // If PIN check needed
  if (locker.pin && pin && String(locker.pin) !== String(pin).trim()) {
    return res.status(401).json({ error: 'Incorrect PIN. Please re-enter or ask hospital staff.' });
  }

  const previousOccupant = locker.occupantName;

  // Safely archive locker files to temp/ so the compartment is fresh for the next occupant
  releaseLockerFiles(locker.id, true);

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
    message: `${locker.lockerNumber} has been unlocked. Please retrieve your items. Thank you!`,
    lockerNumber: locker.lockerNumber
  });
});

// POST /api/kiosk/cleanup-snapshots
router.post('/cleanup-snapshots', (req, res) => {
  cleanAllSnapshots();
  res.json({ success: true, message: 'Snapshots cleared.' });
});

export default router;
