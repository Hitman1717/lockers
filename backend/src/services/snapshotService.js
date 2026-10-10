import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target local snapshots folder directly in the kiosk app
export const KIOSK_SNAPSHOTS_DIR = path.resolve(__dirname, '../../../kiosk-app/snapshots');
export const KIOSK_PUBLIC_SNAPSHOTS_DIR = path.resolve(__dirname, '../../../kiosk-app/public/snapshots');

export const TARGET_DIRS = [KIOSK_SNAPSHOTS_DIR, KIOSK_PUBLIC_SNAPSHOTS_DIR];

/**
 * Ensure snapshot directories exist
 */
function ensureDirectories() {
  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Save base64 image data to local kiosk-app snapshots folder
 * @param {string} lockerNumber - e.g. 'L-101'
 * @param {string} base64Data - Data URL string or raw base64
 * @returns {string|null} Relative URL of saved image (e.g. '/snapshots/snapshot_L-101_1727330000.jpg')
 */
export function saveSnapshot(lockerNumber, base64Data) {
  if (!base64Data || typeof base64Data !== 'string') return null;

  try {
    ensureDirectories();

    // Clean base64 header if present
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(base64Data, 'base64');

    const safeNumber = (lockerNumber || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `snapshot_${safeNumber}_${Date.now()}.jpg`;

    for (const dir of TARGET_DIRS) {
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, buffer);
    }

    console.log(`[Snapshots] Saved local snapshot for locker ${lockerNumber} -> ${filename}`);
    return `/snapshots/${filename}`;
  } catch (err) {
    console.error(`[Snapshots] Failed to save snapshot for ${lockerNumber}:`, err.message);
    return null;
  }
}

/**
 * Delete a specific snapshot file when a locker is released
 * @param {string} photoUrl - e.g. '/snapshots/snapshot_L-101_1727330000.jpg'
 */
export function deleteLockerSnapshot(photoUrl) {
  if (!photoUrl || typeof photoUrl !== 'string') return;

  try {
    const filename = path.basename(photoUrl);
    for (const dir of TARGET_DIRS) {
      const filePath = path.join(dir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Snapshots] Deleted snapshot file upon release: ${filename}`);
      }
    }
  } catch (err) {
    console.error(`[Snapshots] Error deleting snapshot ${photoUrl}:`, err.message);
  }
}

/**
 * Erase all snapshots in the local folders (called when the app closes or restarts)
 */
export function cleanAllSnapshots() {
  try {
    for (const dir of TARGET_DIRS) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        let count = 0;
        for (const file of files) {
          if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
            try {
              fs.unlinkSync(path.join(dir, file));
              count++;
            } catch (e) {
              // ignore locked file
            }
          }
        }
        if (count > 0) {
          console.log(`[Snapshots] Erased ${count} local snapshots from ${path.basename(dir)}.`);
        }
      }
    }
  } catch (err) {
    console.error('[Snapshots] Error erasing snapshots on app close:', err.message);
  }
}

/**
 * Initialize snapshot service: ensure dirs, clean stale files, and register shutdown hooks
 */
export function initSnapshotService() {
  ensureDirectories();
  // Clear any existing snapshots on startup to ensure a fresh session
  cleanAllSnapshots();

  // Register shutdown hooks to erase images when the application closes
  const handleExit = (signal) => {
    console.log(`[Snapshots] Application closing (${signal || 'exit'}). Erasing all local snapshot images...`);
    cleanAllSnapshots();
    if (signal) process.exit(0);
  };

  process.once('SIGINT', () => handleExit('SIGINT'));
  process.once('SIGTERM', () => handleExit('SIGTERM'));
  process.on('exit', () => cleanAllSnapshots());
}

export default {
  saveSnapshot,
  deleteLockerSnapshot,
  cleanAllSnapshots,
  initSnapshotService,
  KIOSK_SNAPSHOTS_DIR
};
