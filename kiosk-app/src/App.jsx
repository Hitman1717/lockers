import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Bespoke clean SVG icons (Zero Lucide dependencies, zero emojis)
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

  // Compliance Modals (TOS and Privacy Policy)
  const [activeModal, setActiveModal] = useState(null); // null | 'tos' | 'privacy'

  const videoRef = useRef(null);
  const streamRef = useRef(null);

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

  useEffect(() => {
    loadConfig();

    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('locker:update', () => {
      loadConfig();
    });

    // Erase local snapshots when the kiosk window/app closes
    const handleClose = () => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/kiosk/cleanup-snapshots');
      }
    };
    window.addEventListener('beforeunload', handleClose);
    window.addEventListener('pagehide', handleClose);

    return () => {
      socket.disconnect();
      window.removeEventListener('beforeunload', handleClose);
      window.removeEventListener('pagehide', handleClose);
    };
  }, []);

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
      setErrorMsg('Webcam not detected. You can use the mock snapshot below to continue.');
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoData(dataUrl);
      stopCamera();
    } else {
      // Mock snapshot
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 320;
      mockCanvas.height = 240;
      const ctx = mockCanvas.getContext('2d');
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name || 'Kiosk User Snapshot', 160, 120);
      setPhotoData(mockCanvas.toDataURL('image/jpeg', 0.8));
    }
  };

  // Submit Registration (No PIN required)
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

  // Submit Retrieval (No PIN required)
  const submitRetrieval = async (e) => {
    e.preventDefault();
    if (!retrieveLocker.trim()) {
      setErrorMsg('Please enter your Locker Number');
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

  // Physical locker bank mock for real demo visualization
  const lockerBayDoors = ['L-101', 'L-102', 'L-103', 'L-104', 'L-105', 'L-106'];

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
                {wardConfig ? `${wardConfig.ward} (${wardConfig.floor})` : 'Terminal Ready'}
              </span>
            )}
          </div>
        </div>
        <div className="kiosk-stats">
          {configLoading ? (
            <div className="skeleton-box" style={{ width: '130px', height: '32px' }} />
          ) : (
            <span className="avail-count">
              <strong>{wardConfig ? wardConfig.availableCount : '-'}</strong> Lockers Available
            </span>
          )}
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
            <p className="hero-desc">Select an operation below to store or retrieve personal items securely.</p>

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
                  <p>Register identity, verify photo, and unlock assigned compartment</p>
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
                  <p>Enter locker compartment identifier and PIN to release lock</p>
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
                placeholder="e.g. 555-0199"
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
                Next: Photo Verification <IconArrowRight />
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
              <h2>Step 2: Photo Verification</h2>
              <span className="step-indicator">Step 2 of 2</span>
            </div>

            <p className="step-hint">Position face within the preview window for locker security validation.</p>

            <div className="camera-box">
              {!photoData ? (
                <>
                  <video ref={videoRef} autoPlay playsInline className="camera-feed" />
                  <div className="camera-controls">
                    <button className="btn btn-primary" onClick={capturePhoto}>
                      <IconCamera /> Capture Photo
                    </button>
                  </div>
                </>
              ) : (
                <div className="photo-preview-wrap">
                  <img src={photoData} alt="Captured preview" className="photo-preview" />
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
                {loading ? 'Allocating Compartment...' : 'Confirm & Release Latch'}
              </button>
            </div>
          </div>
        )}

        {/* 4. STORE: LOCKER UNLOCKED & ASSIGNED WITH REAL PRODUCT CABINET VISUALIZER */}
        {screen === 'store_unlocked' && (
          <div className="kiosk-card success-card">
            <div className="status-badge-icon">
              <IconCheck />
            </div>
            <h2>Locker Door Released</h2>

            <div className="assigned-locker-display">
              <span className="assigned-label">Assigned Compartment</span>
              <span className="assigned-number">{allocatedLocker ? allocatedLocker.lockerNumber : 'L-101'}</span>
            </div>

            {/* Real Product Demo: Interactive Cabinet Layout */}
            <div className="locker-cabinet-demo">
              <div className="cabinet-header">
                <span>Cabinet Bank 1 - Physical Status</span>
                <span>Active Compartment</span>
              </div>
              <div className="cabinet-grid">
                {lockerBayDoors.map((door) => {
                  const isTarget = allocatedLocker ? allocatedLocker.lockerNumber === door : door === 'L-101';
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

            {/* Clean Numbered Instructions (NO checkmark bullets) */}
            <ol className="instructions-list">
              <li>Compartment solenoid has released. The door is now unlatched.</li>
              <li>Place personal items inside and push door shut until it clicks securely.</li>
              <li>Remember your assigned locker compartment number for collection upon return.</li>
            </ol>

            <div className="timer-notice">
              Session resets to main screen in <strong>{countdown}s</strong>
            </div>

            <button className="btn btn-primary" onClick={resetToHome}>
              Finish & Return to Main
            </button>
          </div>
        )}

        {/* 5. RETRIEVE: VISUAL LOCKER SELECTION SCREEN */}
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
              Tap your compartment door below to automatically release the electronic latch:
            </p>

            {/* Visual Touch-Friendly Locker Matrix */}
            <div className="kiosk-locker-select-grid">
              {((wardConfig && wardConfig.lockers && wardConfig.lockers.length > 0)
                ? wardConfig.lockers
                : lockerBayDoors.map((d) => ({ id: d, lockerNumber: d, status: 'occupied' }))
              ).map((l) => {
                const isSelected = retrieveLocker === l.lockerNumber;
                return (
                  <div
                    key={l.id || l.lockerNumber}
                    className={`kiosk-door-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setRetrieveLocker(l.lockerNumber)}
                  >
                    <span className="kiosk-door-num">{l.lockerNumber}</span>
                    <span className={`kiosk-door-status ${l.status || 'occupied'}`}>
                      {l.status === 'unlocked' ? 'Door Ajar' : l.status === 'available' ? 'Available' : 'In Use'}
                    </span>
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
                  style={{ width: '100%', padding: '0.85rem' }}
                  disabled={!retrieveLocker.trim() || loading}
                >
                  <IconUnlock />
                  {loading ? 'Releasing Latch...' : `Unlock Compartment ${retrieveLocker || ''}`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 6. RETRIEVE: UNLOCKED & RELEASED WITH REAL CABINET VISUALIZER */}
        {screen === 'retrieve_unlocked' && (
          <div className="kiosk-card success-card">
            <div className="status-badge-icon">
              <IconCheck />
            </div>
            <h2>Locker Door Released</h2>

            <div className="assigned-locker-display">
              <span className="assigned-label">Unlocked Compartment</span>
              <span className="assigned-number">{retrievedLockerNumber}</span>
            </div>

            {/* Real Product Demo: Interactive Cabinet Layout */}
            <div className="locker-cabinet-demo">
              <div className="cabinet-header">
                <span>Cabinet Bank 1 - Physical Status</span>
                <span>Active Compartment</span>
              </div>
              <div className="cabinet-grid">
                {lockerBayDoors.map((door) => {
                  const isTarget = retrievedLockerNumber.toUpperCase().includes(door.replace('-', '')) || retrievedLockerNumber === door;
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

            {/* Clean Numbered Instructions (NO checkmark bullets) */}
            <ol className="instructions-list">
              <li>Latch released. Remove all belongings from the compartment.</li>
              <li>Firmly push door closed to complete checkout and free the unit.</li>
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

      {/* Footer with Real TOS and Privacy Policy */}
      <footer className="kiosk-footer">
        <span>For locker assistance or manual staff override, notify the central ward station.</span>
        <div className="footer-compliance-links">
          <button className="compliance-btn" onClick={() => setActiveModal('tos')}>
            Terms of Service
          </button>
          <button className="compliance-btn" onClick={() => setActiveModal('privacy')}>
            Privacy Policy
          </button>
        </div>
      </footer>

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
              <p>These smart storage lockers are designated exclusively for patients, authorized visitors, and clinical staff. Storing hazardous materials, perishable foodstuffs exceeding 12 hours, or unauthorized contraband is strictly prohibited.</p>
              <h4>2. Retention and Maximum Duration</h4>
              <p>Storage duration is limited to 24 consecutive hours unless an explicit clinical extension is granted. Units occupied past the threshold are subject to administrative audit and transfer to facility security.</p>
              <h4>3. Security and Liability</h4>
              <p>While electronic audit logs and latch solenoids are maintained continuously, users are advised not to store irreplaceable valuables. The facility assumes no liability for forgotten items post checkout.</p>
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
              <h4>1. Ephemeral Photo Data Collection</h4>
              <p>During locker check-in, an identity snapshot is collected solely to protect your compartment against unauthorized tampering and fraudulent unlock attempts.</p>
              <h4>2. Local Data Storage & Retention</h4>
              <p>All snapshot verification files and PIN hashes are kept on the local on-premise locker coordinator. Images are permanently scrubbed and purged upon successful retrieval or within 48 hours.</p>
              <h4>3. Regulatory Compliance</h4>
              <p>In adherence to healthcare and privacy guidelines, access logs record only locker IDs and system timestamps. Your data is never transmitted to commercial third-party networks or advertising brokers.</p>
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
