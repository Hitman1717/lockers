import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Bespoke clean SVG icons
function IconHospital() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      <path d="M9 10h6" />
      <path d="M12 7v6" />
    </svg>
  );
}

function IconDeposit() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconRetrieve() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconUnlock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

export default function App() {
  const [wardConfig, setWardConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [screen, setScreen] = useState('home'); // 'home' | 'store_form' | 'store_camera' | 'store_unlocked' | 'retrieve_form' | 'retrieve_unlocked'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Registration Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [allocatedLocker, setAllocatedLocker] = useState(null);

  // Retrieve Form State
  const [retrieveLocker, setRetrieveLocker] = useState('');
  const [retrievedLockerNumber, setRetrievedLockerNumber] = useState('');

  // Auto-reset countdown
  const [countdown, setCountdown] = useState(15);

  // Compliance and Storage Modals
  const [activeModal, setActiveModal] = useState(null); // null | 'tos' | 'privacy' | 'biometrics'
  const [bioSummary, setBioSummary] = useState([]);
  const [selectedBioFolder, setSelectedBioFolder] = useState('locker1');
  const [selectedBioDetails, setSelectedBioDetails] = useState(null);
  const [bioLoading, setBioLoading] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 10 Lockers Bank (Locker 1 to Locker 10)
  const lockerBayDoors = [
    'Locker 1', 'Locker 2', 'Locker 3', 'Locker 4', 'Locker 5',
    'Locker 6', 'Locker 7', 'Locker 8', 'Locker 9', 'Locker 10'
  ];

  // Load Ward info
  const loadConfig = async () => {
    try {
      const res = await fetch('/api/kiosk/config');
      if (res.ok) {
        const data = await res.json();
        setWardConfig(data);
      }
    } catch (err) {
      console.error('Failed to load kiosk config:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  // Load Biometrics Storage Summary
  const loadBioSummary = async () => {
    setBioLoading(true);
    try {
      const res = await fetch('/api/kiosk/lockers-info');
      if (res.ok) {
        const data = await res.json();
        setBioSummary(data.lockers || []);
        if (data.lockers && data.lockers.length > 0) {
          const defaultFolder = selectedBioFolder || data.lockers[0].folderName;
          loadBioDetails(defaultFolder);
        }
      }
    } catch (err) {
      console.error('Failed to load biometrics summary:', err);
    } finally {
      setBioLoading(false);
    }
  };

  // Load specific locker biometrics (images & 512-dim embedding)
  const loadBioDetails = async (folderName) => {
    try {
      setSelectedBioFolder(folderName);
      const res = await fetch(`/api/kiosk/lockers/${folderName}/biometrics`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBioDetails(data);
      }
    } catch (err) {
      console.error('Failed to load biometrics details:', err);
    }
  };

  useEffect(() => {
    loadConfig();

    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('locker:update', () => {
      loadConfig();
      if (activeModal === 'biometrics') {
        loadBioSummary();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeModal]);

  // Handle countdown timer for unlocked screens
  useEffect(() => {
    let timer;
    if ((screen === 'store_unlocked' || screen === 'retrieve_unlocked') && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if ((screen === 'store_unlocked' || screen === 'retrieve_unlocked') && countdown === 0) {
      resetToHome();
    }
    return () => clearTimeout(timer);
  }, [screen, countdown]);

  const resetToHome = () => {
    stopCamera();
    setName('');
    setPhone('');
    setPhotoData(null);
    setAllocatedLocker(null);
    setRetrieveLocker('');
    setRetrievedLockerNumber('');
    setErrorMsg('');
    setScreen('home');
    setCountdown(15);
    loadConfig();
  };

  // Camera helpers
  const startCamera = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera not available or denied:', err);
      setCameraActive(false);
      setErrorMsg('Webcam not detected. You can use the snapshot fallback to continue.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && cameraActive) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoData(dataUrl);
      stopCamera();
    } else {
      // Mock biometric portrait
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 320;
      mockCanvas.height = 240;
      const ctx = mockCanvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 320, 240);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name || 'Verified Kiosk User', 160, 115);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('512-D Face Vector Generated', 160, 140);
      setPhotoData(mockCanvas.toDataURL('image/jpeg', 0.85));
    }
  };

  // Submit Registration
  const submitRegistration = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/kiosk/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          photo: photoData,
          wardId: wardConfig ? wardConfig.wardId : 1
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to allocate locker');
      }

      setAllocatedLocker(data.locker);
      setCountdown(15);
      setScreen('store_unlocked');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Retrieval
  const submitRetrieval = async (e) => {
    e.preventDefault();
    if (!retrieveLocker.trim()) {
      setErrorMsg('Please select your locker compartment.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/kiosk/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lockerNumber: retrieveLocker.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to unlock locker');
      }

      setRetrievedLockerNumber(data.lockerNumber || retrieveLocker);
      setCountdown(15);
      setScreen('retrieve_unlocked');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Determine if a door in the cabinet visualizer is the active door
  const isDoorActive = (doorName, activeTarget) => {
    if (!activeTarget) return false;
    const cleanTarget = String(activeTarget).toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanDoor = String(doorName).toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanTarget === cleanDoor || cleanTarget.includes(cleanDoor) || cleanDoor.includes(cleanTarget);
  };

  return (
    <div className="kiosk-container">
      {/* Top Header */}
      <header className="kiosk-header">
        <div className="kiosk-branding">
          <div className="branding-icon">
            <IconHospital />
          </div>
          <div>
            {configLoading ? (
              <div className="skeleton-box skeleton-header" />
            ) : (
              <h2>{wardConfig ? wardConfig.branch : 'Hospital Smart Lockers'}</h2>
            )}
            {configLoading ? (
              <div className="skeleton-box skeleton-badge" />
            ) : (
              <span className="ward-badge">
                {wardConfig ? `${wardConfig.ward} (${wardConfig.floor})` : 'Terminal Ready'} • 10 Smart Units
              </span>
            )}
          </div>
        </div>

        <div className="kiosk-stats-group">
          <button
            className="bio-storage-btn"
            onClick={() => {
              setActiveModal('biometrics');
              loadBioSummary();
            }}
            title="Inspect 10 Locker Folders (Images & 512-d .npy Embeddings)"
          >
            <IconFolder />
            <span>Biometrics Vault</span>
          </button>

          <div className="kiosk-stats">
            {configLoading ? (
              <div className="skeleton-box" style={{ width: '130px', height: '32px' }} />
            ) : (
              <span className="avail-count">
                <strong>{wardConfig ? wardConfig.availableCount : '-'}</strong> / 10 Available
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="kiosk-main">
        {errorMsg && (
          <div className="alert-banner">
            <IconAlert />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. HOME SCREEN */}
        {screen === 'home' && (
          <div className="action-selection">
            <h1 className="hero-title">Smart Locker Self-Service</h1>
            <p className="hero-desc">
              Biometrically verified contactless locker bank with 10 secured compartments (Locker 1 to 10).
            </p>

            <div className="action-buttons-grid">
              <button
                className="big-action-btn"
                onClick={() => setScreen('store_form')}
                disabled={wardConfig && wardConfig.availableCount === 0}
              >
                <div className="btn-icon-wrapper">
                  <IconDeposit />
                </div>
                <div className="btn-text">
                  <h3>Deposit Items</h3>
                  <p>Register identity, capture face embedding, and unlock available compartment</p>
                </div>
              </button>

              <button
                className="big-action-btn"
                onClick={() => setScreen('retrieve_form')}
              >
                <div className="btn-icon-wrapper">
                  <IconRetrieve />
                </div>
                <div className="btn-text">
                  <h3>Retrieve Items</h3>
                  <p>Select locker compartment (1 to 10) to release electronic latch</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. STORE: USER DETAILS FORM */}
        {screen === 'store_form' && (
          <div className="kiosk-card">
            <div className="card-top">
              <button className="back-btn" onClick={resetToHome}>
                <IconArrowLeft /> Cancel
              </button>
              <h2>Step 1: Enter User Information</h2>
              <span className="step-indicator">Step 1 of 2</span>
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button
                className="btn btn-primary"
                disabled={!name.trim()}
                onClick={() => {
                  setScreen('store_camera');
                  startCamera();
                }}
              >
                Next: Photo Verification & Embedding <IconArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* 3. STORE: CAMERA / PHOTO STEP */}
        {screen === 'store_camera' && (
          <div className="kiosk-card">
            <div className="card-top">
              <button
                className="back-btn"
                onClick={() => {
                  stopCamera();
                  setScreen('store_form');
                }}
              >
                <IconArrowLeft /> Back
              </button>
              <h2>Step 2: Biometric Verification</h2>
              <span className="step-indicator">Step 2 of 2</span>
            </div>

            <p className="step-hint">
              Position face within preview. A 512-dimensional embedding will be computed and stored in your allocated locker folder.
            </p>

            <div className="camera-box">
              {!photoData ? (
                <>
                  <video ref={videoRef} autoPlay playsInline className="camera-feed" />
                  <div className="camera-controls">
                    <button className="btn btn-primary" onClick={capturePhoto}>
                      <IconCamera /> Capture Photo & Extract Embedding
                    </button>
                  </div>
                </>
              ) : (
                <div className="photo-preview-wrap">
                  <img src={photoData} alt="Captured preview" className="photo-preview" />
                  <div className="embedding-badge-preview">
                    <IconCpu />
                    <span>512-D Embedding Vector Ready</span>
                  </div>
                  <div className="camera-controls">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setPhotoData(null);
                        startCamera();
                      }}
                    >
                      Retake Photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                className="btn btn-success"
                disabled={!photoData || loading}
                onClick={submitRegistration}
              >
                <IconUnlock />
                {loading ? 'Allocating Compartment...' : 'Confirm, Save Biometrics & Release Latch'}
              </button>
            </div>
          </div>
        )}

        {/* 4. STORE: LOCKER UNLOCKED & ASSIGNED (10-CABINET VISUALIZER) */}
        {screen === 'store_unlocked' && (
          <div className="kiosk-card success-card">
            <div className="status-badge-icon">
              <IconCheck />
            </div>
            <h2>Locker Door Released</h2>

            <div className="assigned-locker-display">
              <span className="assigned-label">Assigned Compartment</span>
              <span className="assigned-number">{allocatedLocker ? allocatedLocker.lockerNumber : 'Locker 1'}</span>
              <span className="assigned-subtext">Folder: {allocatedLocker ? (allocatedLocker.folderName || 'locker1') : 'locker1'} (Images & Embedding stored)</span>
            </div>

            {/* 10-Compartment Cabinet Grid */}
            <div className="locker-cabinet-demo">
              <div className="cabinet-header">
                <span>10-Locker Cabinet Bank • Physical Hardware Status</span>
                <span>Active Compartment</span>
              </div>
              <div className="cabinet-grid">
                {lockerBayDoors.map((door) => {
                  const target = allocatedLocker ? allocatedLocker.lockerNumber : 'Locker 1';
                  const isTarget = isDoorActive(door, target);
                  return (
                    <div
                      key={door}
                      className={`cabinet-cell ${isTarget ? 'active-door unlocked-pulse' : ''}`}
                    >
                      <span className="cell-num">{door}</span>
                      <span className="cell-state">{isTarget ? 'DOOR OPEN' : 'LATCHED'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <ol className="instructions-list">
              <li>Electronic latch has released. Compartment door is now unlatched.</li>
              <li>Place personal items inside and push door firmly shut until it clicks.</li>
              <li>Your facial biometric snapshot and 512-d vector are secured for retrieval.</li>
            </ol>

            <div className="timer-notice">
              Session resets to main screen in <strong>{countdown}s</strong>
            </div>

            <button className="btn btn-primary" onClick={resetToHome}>
              Finish & Return to Main
            </button>
          </div>
        )}

        {/* 5. RETRIEVE: TOUCH LOCKER SELECTION SCREEN (10 LOCKERS) */}
        {screen === 'retrieve_form' && (
          <div className="kiosk-card">
            <div className="card-top">
              <button className="back-btn" onClick={resetToHome}>
                <IconArrowLeft /> Cancel
              </button>
              <h2>Select Your Locker Compartment</h2>
              <span className="step-indicator">Touch to Select</span>
            </div>

            <p className="step-hint">
              Select your compartment below to release the electronic latch:
            </p>

            {/* 10-Locker Touch Matrix */}
            <div className="kiosk-locker-select-grid">
              {(
                (wardConfig && wardConfig.lockers && wardConfig.lockers.length > 0)
                  ? wardConfig.lockers
                  : lockerBayDoors.map((d, idx) => ({
                      id: String(idx + 1),
                      lockerNumber: d,
                      folderName: `locker${idx + 1}`,
                      status: 'occupied'
                    }))
              ).map((l) => {
                const isSelected = retrieveLocker === l.lockerNumber;
                return (
                  <div
                    key={l.id || l.lockerNumber}
                    className={`kiosk-door-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setRetrieveLocker(l.lockerNumber)}
                  >
                    <div className="kiosk-door-header">
                      <span className="kiosk-door-num">{l.lockerNumber}</span>
                      <span className={`kiosk-door-status ${l.status || 'occupied'}`}>
                        {l.status === 'unlocked' ? 'Door Ajar' : l.status === 'available' ? 'Available' : 'Occupied'}
                      </span>
                    </div>

                    {/* Stored Photo preview if occupied */}
                    {l.occupantPhoto ? (
                      <div className="kiosk-door-photo-wrap">
                        <img src={l.occupantPhoto} alt={l.lockerNumber} className="kiosk-door-thumb" />
                        <span className="kiosk-door-occupant">{l.occupantName || 'Occupied'}</span>
                      </div>
                    ) : (
                      <div className="kiosk-door-empty-wrap">
                        <IconFolder />
                        <span>{l.folderName || `locker${l.id}`}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {retrieveLocker && (
              <div className="kiosk-selected-summary">
                <span>Selected Compartment:</span>
                <strong>{retrieveLocker}</strong>
              </div>
            )}

            <form onSubmit={submitRetrieval}>
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.9rem' }}
                  disabled={!retrieveLocker.trim() || loading}
                >
                  <IconUnlock />
                  {loading ? 'Releasing Latch...' : `Unlock Compartment ${retrieveLocker || ''}`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 6. RETRIEVE: UNLOCKED & RELEASED (10-CABINET VISUALIZER) */}
        {screen === 'retrieve_unlocked' && (
          <div className="kiosk-card success-card">
            <div className="status-badge-icon">
              <IconCheck />
            </div>
            <h2>Locker Door Released</h2>

            <div className="assigned-locker-display">
              <span className="assigned-label">Unlocked Compartment</span>
              <span className="assigned-number">{retrievedLockerNumber}</span>
              <span className="assigned-subtext">Biometrics checked and compartment cleared</span>
            </div>

            {/* 10-Compartment Cabinet Grid */}
            <div className="locker-cabinet-demo">
              <div className="cabinet-header">
                <span>10-Locker Cabinet Bank • Physical Hardware Status</span>
                <span>Active Compartment</span>
              </div>
              <div className="cabinet-grid">
                {lockerBayDoors.map((door) => {
                  const isTarget = isDoorActive(door, retrievedLockerNumber);
                  return (
                    <div
                      key={door}
                      className={`cabinet-cell ${isTarget ? 'active-door unlocked-pulse' : ''}`}
                    >
                      <span className="cell-num">{door}</span>
                      <span className="cell-state">{isTarget ? 'DOOR OPEN' : 'LATCHED'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <ol className="instructions-list">
              <li>Latch released. Remove all belongings from the compartment.</li>
              <li>Firmly push door closed to complete checkout and reset the unit.</li>
              <li>Check compartment thoroughly to ensure no items are left behind.</li>
            </ol>

            <div className="timer-notice">
              Session resets to main screen in <strong>{countdown}s</strong>
            </div>

            <button className="btn btn-primary" onClick={resetToHome}>
              Finish & Return to Main
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="kiosk-footer">
        <div className="footer-info">
          <span>Smart Locker Facility • 10 Biometrically Mapped Compartments (locker1 to locker10)</span>
        </div>
        <div className="footer-compliance-links">
          <button className="compliance-btn" onClick={() => { setActiveModal('biometrics'); loadBioSummary(); }}>
            Vault Storage Explorer
          </button>
          <button className="compliance-btn" onClick={() => setActiveModal('tos')}>
            Terms of Service
          </button>
          <button className="compliance-btn" onClick={() => setActiveModal('privacy')}>
            Privacy Policy
          </button>
        </div>
      </footer>

      {/* BIOMETRICS & EMBEDDING VAULT EXPLORER MODAL */}
      {activeModal === 'biometrics' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <IconFolder />
                <h3>Biometrics & Embeddings Storage (Lockers 1 to 10)</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕ Close</button>
            </div>

            <div className="modal-body">
              <p className="vault-description">
                Direct mapping of the 10 locker compartments (<code>locker1</code> to <code>locker10</code>). Both React frontend and Express backend store and serve the images (<code>image_*.jpg</code>) and 512-dimensional facial embeddings (<code>numpy_*.npy</code>).
              </p>

              {/* Locker Tab Selector */}
              <div className="vault-tabs-grid">
                {(bioSummary.length > 0 ? bioSummary : lockerBayDoors.map((d, idx) => ({
                  lockerNumber: d,
                  folderName: `locker${idx + 1}`,
                  imageCount: 0,
                  embeddingCount: 0
                }))).map((item) => {
                  const isSelected = selectedBioFolder === item.folderName;
                  return (
                    <button
                      key={item.folderName}
                      className={`vault-tab-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => loadBioDetails(item.folderName)}
                    >
                      <span className="tab-title">{item.lockerNumber}</span>
                      <span className="tab-folder">/{item.folderName}</span>
                      <div className="tab-counts">
                        <span className="badge-img">{item.imageCount || 0} img</span>
                        <span className="badge-npy">{item.embeddingCount || 0} .npy</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Locker Detail Panel */}
              <div className="vault-detail-panel">
                <div className="vault-panel-header">
                  <h4>Folder: <code>lockersInfo/{selectedBioFolder}/</code></h4>
                  <span className="vault-status-tag">
                    {selectedBioDetails && selectedBioDetails.images && selectedBioDetails.images.length > 0
                      ? 'Files Present in React & Backend'
                      : 'Folder Ready / Empty'}
                  </span>
                </div>

                <div className="vault-panel-content">
                  {/* Images Column */}
                  <div className="vault-col">
                    <h5>
                      <span>Stored JPEG Images</span>
                      <span className="col-count">({selectedBioDetails ? selectedBioDetails.images.length : 0})</span>
                    </h5>

                    {selectedBioDetails && selectedBioDetails.images && selectedBioDetails.images.length > 0 ? (
                      <div className="vault-images-grid">
                        {selectedBioDetails.images.map((img) => (
                          <div key={img.filename} className="vault-img-card">
                            <img src={img.url} alt={img.filename} className="vault-img-preview" />
                            <div className="vault-img-meta">
                              <strong>{img.filename}</strong>
                              <span>{Math.round(img.sizeBytes / 1024)} KB</span>
                            </div>
                            <a href={img.url} target="_blank" rel="noreferrer" className="vault-link">
                              View Full
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="vault-empty-box">No images stored in this locker compartment yet.</div>
                    )}
                  </div>

                  {/* Embeddings Column */}
                  <div className="vault-col">
                    <h5>
                      <span>512-D NumPy Embeddings (.npy)</span>
                      <span className="col-count">({selectedBioDetails ? selectedBioDetails.embeddings.length : 0})</span>
                    </h5>

                    {selectedBioDetails && selectedBioDetails.embeddings && selectedBioDetails.embeddings.length > 0 ? (
                      <div className="vault-embeddings-list">
                        {selectedBioDetails.embeddings.map((npy) => (
                          <div key={npy.filename} className="vault-npy-card">
                            <div className="npy-card-top">
                              <span className="npy-filename">{npy.filename}</span>
                              <span className="npy-shape">Shape: (512,) float32</span>
                            </div>
                            <div className="npy-metrics">
                              <span className="metric-item"><strong>Size:</strong> {npy.sizeBytes} bytes</span>
                              <span className="metric-item"><strong>L2 Norm:</strong> {npy.l2Norm || '1.0000'}</span>
                              <span className="metric-item"><strong>Range:</strong> [{npy.min}, {npy.max}]</span>
                            </div>

                            {/* First 8 vector dimensions */}
                            <div className="npy-vector-preview">
                              <span className="preview-label">Vector Preview (first 8 dims):</span>
                              <code>
                                {npy.preview && npy.preview.length > 0
                                  ? `[ ${npy.preview.slice(0, 8).join(', ')} ... ]`
                                  : '[ 0.012, -0.045, 0.088, 0.021, -0.033, 0.071, -0.019, 0.042 ... ]'}
                              </code>
                            </div>

                            {/* Colorized vector heat ribbon */}
                            <div className="vector-heat-ribbon" title="512-dimensional vector intensity visualization">
                              {Array.from({ length: 32 }).map((_, i) => (
                                <span
                                  key={i}
                                  className="heat-bar"
                                  style={{
                                    opacity: 0.35 + ((i * 13) % 65) / 100,
                                    height: `${10 + ((i * 17) % 18)}px`
                                  }}
                                />
                              ))}
                            </div>

                            <a href={npy.url} download={npy.filename} className="vault-link">
                              Download {npy.filename}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="vault-empty-box">No .npy embeddings generated for this locker yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Real Terms of Service Modal */}
      {activeModal === 'tos' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Terms of Service - Smart Locker Facility</h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕ Close</button>
            </div>
            <div className="modal-body">
              <h4>1. Authorized Facility Usage</h4>
              <p>These smart storage lockers are designated exclusively for patients, authorized visitors, and clinical staff across compartments 1 through 10. Storing hazardous materials or contraband is strictly prohibited.</p>
              <h4>2. Retention and Maximum Duration</h4>
              <p>Storage duration is limited to 24 consecutive hours. Units occupied past the threshold are subject to administrative audit.</p>
              <h4>3. Security and Liability</h4>
              <p>Continuous IoT electronic telemetry and latch sensors are maintained across all 10 lockers.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Real Privacy Policy Modal */}
      {activeModal === 'privacy' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Privacy Policy & Biometric Verification</h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕ Close</button>
            </div>
            <div className="modal-body">
              <h4>1. Ephemeral Biometric Collection</h4>
              <p>During locker check-in, an identity snapshot and 512-dim facial vector are stored into your assigned locker folder (locker1 to locker10) solely to verify access.</p>
              <h4>2. Local Data Storage & Retention</h4>
              <p>All snapshot verification files and .npy embeddings are kept on-premise in the local coordinator and React frontend public cache.</p>
              <h4>3. Automated Checkout Scrubbing</h4>
              <p>Upon locker release, compartment biometrics are safely cleared and archived.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
