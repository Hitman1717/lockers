import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root folders
export const LOCKERS_INFO_DIR = path.resolve(__dirname, '../../../lockersInfo');
export const KIOSK_PUBLIC_LOCKERS_DIR = path.resolve(__dirname, '../../../kiosk-app/public/lockersInfo');
export const KIOSK_SNAPSHOTS_DIR = path.resolve(__dirname, '../../../kiosk-app/snapshots');
export const KIOSK_PUBLIC_SNAPSHOTS_DIR = path.resolve(__dirname, '../../../kiosk-app/public/snapshots');

export const LOCKER_TARGET_DIRS = [LOCKERS_INFO_DIR, KIOSK_PUBLIC_LOCKERS_DIR];
export const LEGACY_SNAPSHOT_DIRS = [KIOSK_SNAPSHOTS_DIR, KIOSK_PUBLIC_SNAPSHOTS_DIR];

/**
 * Normalizes locker identifiers like 1, "1", "Locker 1", "L-1", "locker1" to standard folder name e.g. "locker1"
 */
export function normalizeLockerFolderName(lockerIdOrNum) {
  if (!lockerIdOrNum) return 'temp';
  const str = String(lockerIdOrNum).trim().toLowerCase();
  const match = str.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `locker${num}`;
  }
  return 'temp';
}

/**
 * Ensure all 10 locker directories (locker1 to locker10) and temp exist across target folders
 */
export function ensureLockerDirectories() {
  for (const baseDir of LOCKER_TARGET_DIRS) {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    for (let i = 1; i <= 10; i++) {
      const folderPath = path.join(baseDir, `locker${i}`);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
    }
    const tempPath = path.join(baseDir, 'temp');
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
  }

  for (const dir of LEGACY_SNAPSHOT_DIRS) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Creates binary-compatible NumPy 1.0 format file (.npy) with shape (512,) float32
 * Total size is exactly 2,176 bytes (128 bytes header + 2048 bytes float data).
 */
export function createNpyBuffer(floatArray512) {
  const magic = Buffer.from([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 0x01, 0x00]);
  const dictStr = "{'descr': '<f4', 'fortran_order': False, 'shape': (512,), }";
  const headerLen = 118; // 10 bytes prefix + 118 = 128 (multiple of 64)
  const padding = ' '.repeat(headerLen - dictStr.length - 1) + '\n';
  const header = Buffer.from(dictStr + padding, 'ascii');
  const lenBuf = Buffer.alloc(2);
  lenBuf.writeUInt16LE(headerLen, 0);

  const dataBuf = Buffer.alloc(512 * 4);
  for (let i = 0; i < 512; i++) {
    dataBuf.writeFloatLE(floatArray512[i] !== undefined ? floatArray512[i] : 0.0, i * 4);
  }
  return Buffer.concat([magic, lenBuf, header, dataBuf]);
}

/**
 * Parses a 512-dim float32 NumPy (.npy) buffer and calculates stats
 */
export function parseNpyBuffer(buffer) {
  if (!buffer || buffer.length < 128 + 512 * 4) return null;
  const floats = [];
  const offset = 128;
  let sumSq = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < 512; i++) {
    const val = buffer.readFloatLE(offset + i * 4);
    floats.push(val);
    sumSq += val * val;
    if (val < min) min = val;
    if (val > max) max = val;
  }

  return {
    shape: [512],
    dtype: 'float32',
    l2Norm: Math.sqrt(sumSq),
    min,
    max,
    preview: floats.slice(0, 10),
    data: floats
  };
}

/**
 * Generates deterministic 512-dim unit vector from image data (L2 norm = 1.0)
 * Mimicking standard facial recognition feature representations (ArcFace/FaceNet 512d)
 */
export function generateNormalizedEmbedding(imageBuffer) {
  const hash = crypto.createHash('sha256').update(imageBuffer).digest();
  const floats = new Float32Array(512);

  let sumSq = 0;
  for (let i = 0; i < 512; i++) {
    const byte1 = hash[i % hash.length];
    const byte2 = hash[(i * 7 + 13) % hash.length];
    // Map to [-0.15, +0.15] distribution
    const rawVal = ((byte1 ^ byte2) / 255.0 - 0.5) * 0.3;
    floats[i] = rawVal;
    sumSq += rawVal * rawVal;
  }

  const norm = Math.sqrt(sumSq) || 1.0;
  for (let i = 0; i < 512; i++) {
    floats[i] /= norm;
  }

  return floats;
}

/**
 * Saves photo snapshot and 512-dim embedding .npy into locker's specific folder (locker1..10)
 * in BOTH backend lockersInfo and frontend react public/lockersInfo
 */
export function saveLockerBiometrics(lockerIdOrNum, base64Data, customEmbedding = null) {
  if (!base64Data || typeof base64Data !== 'string') return null;

  try {
    ensureLockerDirectories();

    const folderName = normalizeLockerFolderName(lockerIdOrNum);
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const imageBuffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(base64Data, 'base64');

    // Determine next file index in folder
    const targetDirPrimary = path.join(LOCKERS_INFO_DIR, folderName);
    let nextIndex = 1;
    if (fs.existsSync(targetDirPrimary)) {
      const files = fs.readdirSync(targetDirPrimary);
      const imgIndices = files
        .map((f) => {
          const m = f.match(/image_(\d+)\.jpg/);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter((n) => n > 0);
      if (imgIndices.length > 0) {
        nextIndex = Math.max(...imgIndices) + 1;
      }
    }

    const imageFilename = `image_${nextIndex}.jpg`;
    const numpyFilename = `numpy_${nextIndex}.npy`;

    // Generate or use embedding
    const embeddingArray = customEmbedding || generateNormalizedEmbedding(imageBuffer);
    const npyBuffer = createNpyBuffer(embeddingArray);

    // Write to both root lockersInfo and kiosk-app/public/lockersInfo
    for (const baseDir of LOCKER_TARGET_DIRS) {
      const lockerFolder = path.join(baseDir, folderName);
      if (!fs.existsSync(lockerFolder)) {
        fs.mkdirSync(lockerFolder, { recursive: true });
      }

      fs.writeFileSync(path.join(lockerFolder, imageFilename), imageBuffer);
      fs.writeFileSync(path.join(lockerFolder, numpyFilename), npyBuffer);
    }

    console.log(`[Biometrics] Stored ${imageFilename} and ${numpyFilename} into ${folderName} in backend and frontend react.`);

    return {
      folderName,
      imageFilename,
      numpyFilename,
      imageUrl: `/lockersInfo/${folderName}/${imageFilename}`,
      embeddingUrl: `/lockersInfo/${folderName}/${numpyFilename}`,
      embeddingLength: 512,
      savedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error(`[Biometrics] Error saving biometrics for ${lockerIdOrNum}:`, err.message);
    return null;
  }
}

/**
 * Retrieves biometric files and embedding inspection for a given locker
 */
export function getLockerBiometrics(lockerIdOrNum) {
  const folderName = normalizeLockerFolderName(lockerIdOrNum);
  const lockerFolder = path.join(LOCKERS_INFO_DIR, folderName);

  if (!fs.existsSync(lockerFolder)) {
    return {
      folderName,
      exists: false,
      images: [],
      embeddings: []
    };
  }

  const files = fs.readdirSync(lockerFolder);
  const images = [];
  const embeddings = [];

  for (const file of files) {
    const filePath = path.join(lockerFolder, file);
    const stat = fs.statSync(filePath);

    if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
      images.push({
        filename: file,
        url: `/lockersInfo/${folderName}/${file}`,
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString()
      });
    } else if (file.endsWith('.npy')) {
      let stats = null;
      try {
        const buf = fs.readFileSync(filePath);
        stats = parseNpyBuffer(buf);
      } catch (e) {
        // failed parse
      }

      embeddings.push({
        filename: file,
        url: `/lockersInfo/${folderName}/${file}`,
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
        shape: stats ? stats.shape : [512],
        dtype: stats ? stats.dtype : 'float32',
        l2Norm: stats ? Number(stats.l2Norm.toFixed(4)) : null,
        min: stats ? Number(stats.min.toFixed(4)) : null,
        max: stats ? Number(stats.max.toFixed(4)) : null,
        preview: stats ? stats.preview.map((v) => Number(v.toFixed(4))) : []
      });
    }
  }

  return {
    folderName,
    exists: true,
    totalImages: images.length,
    totalEmbeddings: embeddings.length,
    images: images.sort((a, b) => a.filename.localeCompare(b.filename)),
    embeddings: embeddings.sort((a, b) => a.filename.localeCompare(b.filename))
  };
}

/**
 * Returns complete summary of all 10 lockers + temp folder storage
 */
export function getAllLockersStorageSummary() {
  ensureLockerDirectories();
  const summary = [];

  for (let i = 1; i <= 10; i++) {
    const folderName = `locker${i}`;
    const bio = getLockerBiometrics(folderName);
    summary.push({
      lockerNumber: `Locker ${i}`,
      folderName,
      hasFiles: bio.images.length > 0 || bio.embeddings.length > 0,
      imageCount: bio.images.length,
      embeddingCount: bio.embeddings.length,
      images: bio.images,
      embeddings: bio.embeddings
    });
  }

  // Include temp
  const tempBio = getLockerBiometrics('temp');
  summary.push({
    lockerNumber: 'Temp Storage',
    folderName: 'temp',
    hasFiles: tempBio.images.length > 0 || tempBio.embeddings.length > 0,
    imageCount: tempBio.images.length,
    embeddingCount: tempBio.embeddings.length,
    images: tempBio.images,
    embeddings: tempBio.embeddings
  });

  return summary;
}

/**
 * Clean or archive locker files upon release
 */
export function releaseLockerFiles(lockerIdOrNum, archive = true) {
  const folderName = normalizeLockerFolderName(lockerIdOrNum);

  for (const baseDir of LOCKER_TARGET_DIRS) {
    const lockerFolder = path.join(baseDir, folderName);
    if (!fs.existsSync(lockerFolder)) continue;

    const files = fs.readdirSync(lockerFolder);
    if (files.length === 0) continue;

    if (archive) {
      const archiveDir = path.join(baseDir, 'temp', `archived_${folderName}_${Date.now()}`);
      fs.mkdirSync(archiveDir, { recursive: true });
      for (const file of files) {
        try {
          fs.renameSync(path.join(lockerFolder, file), path.join(archiveDir, file));
        } catch (e) {
          // fallback copy & unlink
          fs.copyFileSync(path.join(lockerFolder, file), path.join(archiveDir, file));
          fs.unlinkSync(path.join(lockerFolder, file));
        }
      }
      console.log(`[Biometrics] Archived ${files.length} files from ${folderName} to temp/`);
    } else {
      for (const file of files) {
        fs.unlinkSync(path.join(lockerFolder, file));
      }
      console.log(`[Biometrics] Cleared ${files.length} files from ${folderName}`);
    }
  }
}

// Backward compatible wrappers for existing kiosk routes
export function saveSnapshot(lockerNumber, base64Data) {
  const res = saveLockerBiometrics(lockerNumber, base64Data);
  return res ? res.imageUrl : null;
}

export function deleteLockerSnapshot(photoUrl) {
  // Safe cleanup
  if (!photoUrl) return;
  const match = photoUrl.match(/locker\d+/);
  if (match) {
    releaseLockerFiles(match[0], true);
  }
}

export function cleanAllSnapshots() {
  ensureLockerDirectories();
}

export function initSnapshotService() {
  ensureLockerDirectories();
  console.log('[Snapshot/Biometrics] Lockers 1 to 10 mapped in backend and kiosk-app/public/lockersInfo.');
}

export default {
  LOCKERS_INFO_DIR,
  KIOSK_PUBLIC_LOCKERS_DIR,
  ensureLockerDirectories,
  createNpyBuffer,
  parseNpyBuffer,
  generateNormalizedEmbedding,
  saveLockerBiometrics,
  getLockerBiometrics,
  getAllLockersStorageSummary,
  releaseLockerFiles,
  saveSnapshot,
  deleteLockerSnapshot,
  cleanAllSnapshots,
  initSnapshotService
};
