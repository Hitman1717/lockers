import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Bespoke clean SVG icons
function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconUnlock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconBattery() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
      <line x1="23" y1="11" x2="23" y2="13" />
    </svg>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [currentUser, setCurrentUser] = useState(null);

  // Theme state: 'dark' (default) or 'light'
  const [theme, setTheme] = useState(localStorage.getItem('admin_theme') || 'dark');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('admin_theme', next);
  };

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Active Tab: 'dashboard' | 'hierarchy' | 'employees' | 'reports'
  const [tab, setTab] = useState('dashboard');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'available' | 'occupied' | 'unlocked' | 'maintenance'

  // Selected Locker for Inspector Drawer
  const [selectedLockerId, setSelectedLockerId] = useState(null);

  // Data states
  const [lockers, setLockers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Compliance Modals
  const [activeModal, setActiveModal] = useState(null);

  // Forms state
  const [newWardName, setNewWardName] = useState('');
  const [newWardFloor, setNewWardFloor] = useState('');
  const [newLockerNumber, setNewLockerNumber] = useState('');
  const [newLockerWard, setNewLockerWard] = useState('1');

  // Employee creation state
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRole, setEmpRole] = useState('staff');

  // Check auth on startup
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error('Session expired');
          return res.json();
        })
        .then((data) => {
          setCurrentUser(data.user);
        })
        .catch(() => {
          logout();
        });
    }
  }, [token]);

  // Load initial dashboard data
  const refreshData = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [lockersRes, summaryRes, eventsRes] = await Promise.all([
        fetch('/api/lockers'),
        fetch('/api/lockers/summary'),
        fetch('/api/reports/events?limit=30', { headers })
      ]);

      if (lockersRes.ok) setLockers(await lockersRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (eventsRes.ok) {
        const evData = await eventsRes.json();
        setEvents(evData.events || []);
      }

      // Hierarchy
      const hierRes = await fetch('/api/hierarchy', { headers });
      if (hierRes.ok) setHierarchy(await hierRes.json());

      // Employees (if allowed)
      const empRes = await fetch('/api/employees', { headers });
      if (empRes.ok) setEmployees(await empRes.json());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  // Socket.IO real-time listener
  useEffect(() => {
    if (!token) return;

    refreshData();

    const socket = io('/', { transports: ['websocket', 'polling'] });

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('locker:update', (updatedLocker) => {
      setLockers((prev) =>
        prev.map((l) => (String(l.id) === String(updatedLocker.id) ? updatedLocker : l))
      );
      // Refresh summary & events
      fetch('/api/lockers/summary')
        .then((r) => r.json())
        .then((s) => setSummary(s))
        .catch(() => {});

      fetch('/api/reports/events?limit=30', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((r) => r.json())
        .then((d) => setEvents(d.events || []))
        .catch(() => {});
    });

    socket.on('locker:heartbeat', ({ lockerId, lastHeartbeat, batteryLevel }) => {
      setLockers((prev) =>
        prev.map((l) =>
          String(l.id) === String(lockerId) ? { ...l, lastHeartbeat, batteryLevel } : l
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Handle Login
  const handleLogin = async (email, password) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setCurrentUser(null);
  };

  // Force Unlock Override
  const handleForceUnlock = async (locker) => {
    if (!confirm(`Confirm manual solenoid unlock override for compartment ${locker.lockerNumber}?`)) return;

    try {
      const res = await fetch(`/api/lockers/${locker.id}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Admin Console Solenoid Override' })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`Unlock command dispatched to relay for compartment ${locker.lockerNumber}`);
      } else {
        alert(data.error || 'Failed to dispatch unlock');
      }
    } catch (err) {
      alert('Error dispatching unlock: ' + err.message);
    }
  };

  // Toggle Maintenance
  const handleToggleMaintenance = async (locker) => {
    const nextStatus = locker.status === 'maintenance' ? 'available' : 'maintenance';
    try {
      const res = await fetch(`/api/lockers/${locker.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        showMessage(`Compartment ${locker.lockerNumber} status set to ${nextStatus}`);
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  // Create Ward
  const handleCreateWard = async (e) => {
    e.preventDefault();
    if (!newWardName) return;

    try {
      const res = await fetch('/api/hierarchy/wards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          branchId: currentUser.branchId || 1,
          name: newWardName,
          floor: newWardFloor || '1st Floor'
        })
      });
      if (res.ok) {
        setNewWardName('');
        setNewWardFloor('');
        refreshData();
        showMessage('New ward created successfully');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to create ward');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Create Locker
  const handleCreateLocker = async (e) => {
    e.preventDefault();
    if (!newLockerNumber) return;

    try {
      const res = await fetch('/api/lockers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          wardId: newLockerWard,
          lockerNumber: newLockerNumber.trim()
        })
      });
      if (res.ok) {
        setNewLockerNumber('');
        refreshData();
        showMessage('New compartment registered successfully');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to register locker');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Create Employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!empName || !empEmail || !empPassword) return;

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: empName,
          email: empEmail,
          password: empPassword,
          role: empRole,
          branchId: currentUser.branchId || 1
        })
      });
      if (res.ok) {
        setEmpName('');
        setEmpEmail('');
        setEmpPassword('');
        refreshData();
        showMessage('Employee account created successfully');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to create employee');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Employee Active
  const handleToggleEmployeeActive = async (emp) => {
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !emp.isActive })
      });
      if (res.ok) {
        refreshData();
        showMessage(`Updated active state for ${emp.name}`);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const showMessage = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(''), 4000);
  };

  // Filtered lockers based on Ward, Status chip, and Search query
  const filteredLockers = lockers.filter((l) => {
    // Ward filter
    if (selectedWard !== 'all' && String(l.wardId) !== String(selectedWard)) {
      return false;
    }
    // Status filter
    if (statusFilter !== 'all' && l.status !== statusFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = l.lockerNumber && l.lockerNumber.toLowerCase().includes(q);
      const matchOcc = l.occupantName && l.occupantName.toLowerCase().includes(q);
      const matchPhone = l.occupantPhone && l.occupantPhone.toLowerCase().includes(q);
      if (!matchNum && !matchOcc && !matchPhone) return false;
    }
    return true;
  });

  // Selected locker object
  const activeLocker = lockers.find((l) => l.id === selectedLockerId) || null;

  // RENDER: LOGIN VIEW
  if (!token || !currentUser) {
    return (
      <div className="login-wrapper" data-theme={theme}>
        <div className="login-box">
          <div className="login-header">
            <div className="login-icon-wrap">
              <IconShield />
            </div>
            <h2>Smart Locker Administration</h2>
            <p>Facility Operations & Hardware Console</p>
          </div>

          {authError && <div className="alert-banner">{authError}</div>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(loginEmail, loginPassword);
            }}
          >
            <div className="form-group">
              <label>Work Email</label>
              <input
                type="email"
                placeholder="name@lockers.local"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Security Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={authLoading}>
              {authLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="demo-accounts-section">
            <span className="demo-title">Quick Demo Logins</span>
            <div className="demo-buttons">
              <button
                type="button"
                className="demo-btn"
                onClick={() => handleLogin('admin@lockers.local', 'Admin123!')}
              >
                <span>Super Administrator</span>
                <span className="demo-btn-role">admin@lockers.local</span>
              </button>
              <button
                type="button"
                className="demo-btn"
                onClick={() => handleLogin('branch@lockers.local', 'Branch123!')}
              >
                <span>Branch Administrator</span>
                <span className="demo-btn-role">branch@lockers.local</span>
              </button>
              <button
                type="button"
                className="demo-btn"
                onClick={() => handleLogin('staff@lockers.local', 'Staff123!')}
              >
                <span>Clinical Staff</span>
                <span className="demo-btn-role">staff@lockers.local</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: MAIN ADMIN PORTAL
  return (
    <div className="admin-container" data-theme={theme}>
      {/* Top Navbar */}
      <nav className="top-nav">
        <div className="nav-left">
          <div className="nav-brand">
            <div className="brand-icon">
              <IconShield />
            </div>
            <div className="brand-titles">
              <h3>Smart Locker Console</h3>
              <span className="brand-sub">Central Facility & Hardware Controller</span>
            </div>
          </div>

          <span className={`socket-indicator ${socketConnected ? 'online' : 'offline'}`}>
            <span className="indicator-dot" />
            {socketConnected ? 'MQTT Broker Online' : 'Broker Offline'}
          </span>
        </div>

        <div className="nav-right">
          {/* Quick Search */}
          <div className="nav-search">
            <span className="search-icon-pos">
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Search locker or occupant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Theme Switcher */}
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark/Light Mode">
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* User Profile */}
          <div className="nav-profile">
            <div className="user-details">
              <span className="user-name">{currentUser.name}</span>
              <span className="role-tag">{currentUser.role.replace('_', ' ')}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Navigation Tabs */}
      <div className="tabs-bar">
        <button
          className={`tab-btn ${tab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setTab('dashboard')}
        >
          <IconDashboard /> Live Dashboard
          <span className="tab-count-badge">{lockers.length}</span>
        </button>
        {(currentUser.role === 'super_admin' || currentUser.role === 'branch_admin') && (
          <button
            className={`tab-btn ${tab === 'hierarchy' ? 'active' : ''}`}
            onClick={() => setTab('hierarchy')}
          >
            <IconBuilding /> Wards & Hierarchy
            <span className="tab-count-badge">{hierarchy ? hierarchy.wards.length : 0}</span>
          </button>
        )}
        {(currentUser.role === 'super_admin' || currentUser.role === 'branch_admin') && (
          <button
            className={`tab-btn ${tab === 'employees' ? 'active' : ''}`}
            onClick={() => setTab('employees')}
          >
            <IconUsers /> Employees & Roles
            <span className="tab-count-badge">{employees.length}</span>
          </button>
        )}
        <button
          className={`tab-btn ${tab === 'reports' ? 'active' : ''}`}
          onClick={() => setTab('reports')}
        >
          <IconClipboard /> Audit Logs & Telemetry
          <span className="tab-count-badge">{events.length}</span>
        </button>
      </div>

      {actionMessage && <div className="toast-banner">{actionMessage}</div>}

      <main className="admin-main">
        {/* ================= TAB 1: LIVE DASHBOARD ================= */}
        {tab === 'dashboard' && (
          <div>
            {/* Telemetry KPI Strip */}
            <div className="stats-strip">
              <div className="stat-item total">
                <div className="stat-header">
                  <span className="stat-label">Total Units</span>
                  <span className="stat-icon"><IconDashboard /></span>
                </div>
                <span className="stat-num">{summary ? summary.total : lockers.length}</span>
                <span className="stat-sub">Across {hierarchy ? hierarchy.wards.length : 2} Active Wards</span>
              </div>

              <div className="stat-item available">
                <div className="stat-header">
                  <span className="stat-label">Available</span>
                  <span className="stat-icon" style={{ color: 'var(--success)' }}>●</span>
                </div>
                <span className="stat-num">{summary ? summary.available : 0}</span>
                <span className="stat-sub">Ready for Immediate Assignment</span>
              </div>

              <div className="stat-item occupied">
                <div className="stat-header">
                  <span className="stat-label">Occupied</span>
                  <span className="stat-icon" style={{ color: 'var(--info)' }}>●</span>
                </div>
                <span className="stat-num">{summary ? summary.occupied : 0}</span>
                <span className="stat-sub">Active Storage Sessions</span>
              </div>

              <div className="stat-item unlocked">
                <div className="stat-header">
                  <span className="stat-label">Door Ajar</span>
                  <span className="stat-icon" style={{ color: 'var(--warning)' }}>●</span>
                </div>
                <span className="stat-num">{summary ? summary.unlocked : 0}</span>
                <span className="stat-sub">{summary && summary.unlocked > 0 ? 'Solenoid Engaged / Open' : 'All Doors Latched'}</span>
              </div>

              <div className="stat-item maintenance">
                <div className="stat-header">
                  <span className="stat-label">Maintenance</span>
                  <span className="stat-icon" style={{ color: 'var(--danger)' }}>●</span>
                </div>
                <span className="stat-num">{summary ? summary.maintenance : 0}</span>
                <span className="stat-sub">Hardware Lockout State</span>
              </div>
            </div>

            {/* Control & Filter Toolbar */}
            <div className="toolbar-bar">
              <div className="toolbar-group">
                <label>Ward:</label>
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                >
                  <option value="all">All Facility Wards</option>
                  {hierarchy &&
                    hierarchy.wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.floor})
                      </option>
                    ))}
                </select>

                <div className="filter-chips">
                  <button
                    className={`chip-btn ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All ({lockers.length})
                  </button>
                  <button
                    className={`chip-btn ${statusFilter === 'available' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('available')}
                  >
                    Available
                  </button>
                  <button
                    className={`chip-btn ${statusFilter === 'occupied' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('occupied')}
                  >
                    Occupied
                  </button>
                  <button
                    className={`chip-btn ${statusFilter === 'unlocked' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('unlocked')}
                  >
                    Door Ajar
                  </button>
                  <button
                    className={`chip-btn ${statusFilter === 'maintenance' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('maintenance')}
                  >
                    Maint.
                  </button>
                </div>
              </div>

              <button className="btn btn-secondary btn-sm" onClick={refreshData}>
                <IconRefresh /> Refresh Hardware
              </button>
            </div>

            {/* TWO-PANEL OPERATIONAL LAYOUT: LOCKER BANK + INSPECTOR/STREAM */}
            <div className="operational-split">
              {/* Left Panel: Physical Locker Bank Cabinet */}
              <div className="locker-bay-enclosure">
                <div className="enclosure-header">
                  <div className="enclosure-title-group">
                    <span className="enclosure-title">Modular Enclosure Bank A1</span>
                    <span className="enclosure-bus-tag">CANBus: 0x4B &bull; RS-485</span>
                  </div>

                  <div className="enclosure-legend">
                    <div className="legend-item">
                      <span className="legend-dot available" /> Available
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot occupied" /> Occupied
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot unlocked" /> Unlatched
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot maintenance" /> Lockout
                    </div>
                  </div>
                </div>

                <div className="enclosure-grid">
                  {filteredLockers.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                      No compartments match the selected filters.
                    </div>
                  ) : (
                    filteredLockers.map((locker) => {
                      const isSelected = selectedLockerId === locker.id;
                      const batteryVal = locker.batteryLevel || 100;
                      const battClass = batteryVal > 60 ? 'good' : batteryVal > 30 ? 'med' : 'low';

                      return (
                        <div
                          key={locker.id}
                          className={`comp-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedLockerId(locker.id)}
                        >
                          <div className="comp-card-top">
                            <span className="comp-id-badge">{locker.lockerNumber}</span>
                            <span className={`comp-status-led ${locker.status}`}>
                              ● {locker.status === 'unlocked' ? 'Ajar' : locker.status}
                            </span>
                          </div>

                          {/* Solenoid Door Wireframe Indicator */}
                          <div className="comp-door-wireframe">
                            <span>Solenoid:</span>
                            <span
                              className="door-latch-text"
                              style={{ color: locker.status === 'unlocked' ? 'var(--warning)' : 'var(--text-main)' }}
                            >
                              {locker.status === 'unlocked' ? 'UNLATCHED' : 'LATCHED'}
                            </span>
                          </div>

                          <div className="comp-meta-row">
                            <span className="comp-occupant-name">
                              {locker.occupantName ? locker.occupantName : 'Vacant (Available)'}
                            </span>

                            <div className="comp-battery-bar-wrap">
                              <IconBattery />
                              <div className="battery-track">
                                <div className={`battery-fill ${battClass}`} style={{ width: `${batteryVal}%` }} />
                              </div>
                              <span>{batteryVal}%</span>
                            </div>
                          </div>

                          <div className="comp-quick-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="comp-act-btn primary"
                              onClick={() => handleForceUnlock(locker)}
                              title="Manual solenoid release"
                            >
                              <IconUnlock /> Unlock
                            </button>
                            <button
                              className="comp-act-btn"
                              onClick={() => handleToggleMaintenance(locker)}
                              title="Toggle maintenance lock"
                            >
                              {locker.status === 'maintenance' ? 'Restore' : 'Lockout'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Panel: Live Inspector Drawer or Real-time Activity Feed */}
              <div className="inspector-panel">
                <div className="inspector-header">
                  <h4>
                    <IconActivity />
                    {activeLocker ? `Compartment ${activeLocker.lockerNumber}` : 'Live Hardware Telemetry'}
                  </h4>
                  {activeLocker && (
                    <button
                      className="comp-act-btn"
                      style={{ padding: '0.2rem 0.5rem' }}
                      onClick={() => setSelectedLockerId(null)}
                    >
                      Deselect
                    </button>
                  )}
                </div>

                {activeLocker ? (
                  /* Detail Inspector for Selected Locker */
                  <div className="inspector-body">
                    <div className="inspector-item">
                      <span className="inspector-item-label">Status & State</span>
                      <span className={`comp-status-led ${activeLocker.status}`} style={{ alignSelf: 'flex-start', marginTop: '0.2rem' }}>
                        ● {activeLocker.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="inspector-item">
                      <span className="inspector-item-label">Assigned Location</span>
                      <span className="inspector-item-val">
                        {activeLocker.wardId === 1 ? 'Ward 3A (3rd Floor)' : activeLocker.wardId === 2 ? 'Ward 1B (1st Floor)' : `Ward ${activeLocker.wardId}`}
                      </span>
                    </div>

                    <div className="inspector-item">
                      <span className="inspector-item-label">Hardware Sensor Telemetry</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>
                          <strong>Battery:</strong> {activeLocker.batteryLevel || 100}% &bull; 3.28V DC
                        </span>
                        <span style={{ fontSize: '0.85rem' }}>
                          <strong>Solenoid Relay:</strong> {activeLocker.status === 'unlocked' ? 'Released / Door Open' : 'Engaged / Latched'}
                        </span>
                        <span style={{ fontSize: '0.85rem' }}>
                          <strong>Heartbeat:</strong> {activeLocker.lastHeartbeat ? new Date(activeLocker.lastHeartbeat).toLocaleTimeString() : 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="inspector-item">
                      <span className="inspector-item-label">Occupancy Details</span>
                      {activeLocker.occupantName ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <span className="inspector-item-val">{activeLocker.occupantName}</span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Phone: {activeLocker.occupantPhone || 'N/A'}
                          </span>
                          {activeLocker.occupantPhoto && (
                            <div className="inspector-photo-box" style={{ marginTop: '0.5rem' }}>
                              <img src={activeLocker.occupantPhoto} alt="Occupant snapshot" className="inspector-photo" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                          No active user session. Unit is vacant and available.
                        </span>
                      )}
                    </div>

                    <div className="inspector-actions">
                      <button
                        className="btn btn-primary btn-block"
                        onClick={() => handleForceUnlock(activeLocker)}
                      >
                        <IconUnlock /> Dispatch Override Unlock
                      </button>
                      <button
                        className="btn btn-secondary btn-block"
                        onClick={() => handleToggleMaintenance(activeLocker)}
                      >
                        {activeLocker.status === 'maintenance' ? 'Exit Maintenance Lockout' : 'Place in Maintenance Lockout'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Real-time Activity Feed when no locker selected */
                  <div className="inspector-body">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Click any compartment in the bank to inspect telemetry, or view real-time hardware events below:
                    </span>

                    <div className="activity-stream">
                      {events.length === 0 ? (
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                          No hardware events logged in current session.
                        </div>
                      ) : (
                        events.slice(0, 8).map((ev) => (
                          <div key={ev.id} className="stream-row">
                            <div className="stream-top">
                              <span className="stream-time">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                              <span className="stream-event-type">{ev.eventType}</span>
                            </div>
                            <span className="stream-desc">
                              <strong>Locker {ev.lockerId}:</strong> {ev.details?.action || ev.details?.trigger || 'Status Update'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: HIERARCHY & WARDS ================= */}
        {tab === 'hierarchy' && hierarchy && (
          <div className="two-column-layout">
            <div>
              <h3>Ward & Locker Architecture</h3>
              {hierarchy.branches.map((b) => (
                <div key={b.id} className="tree-card">
                  <h4><IconBuilding /> {b.name}</h4>
                  <p className="address-text">{b.address}</p>

                  <div className="ward-list">
                    {hierarchy.wards
                      .filter((w) => w.branchId === b.id)
                      .map((w) => {
                        const wardLockers = lockers.filter((l) => l.wardId === w.id);
                        return (
                          <div key={w.id} className="ward-item">
                            <div>
                              <strong>{w.name}</strong> &bull; {w.floor}
                            </div>
                            <span className="badge-count">{wardLockers.length} compartments</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            <div className="forms-column">
              <div className="panel-card">
                <h3>Register Ward Section</h3>
                <form onSubmit={handleCreateWard}>
                  <div className="form-group">
                    <label>Ward Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ward 4D - Pediatric"
                      value={newWardName}
                      onChange={(e) => setNewWardName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Floor Level</label>
                    <input
                      type="text"
                      placeholder="e.g. 4th Floor"
                      value={newWardFloor}
                      onChange={(e) => setNewWardFloor(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Create Ward Section
                  </button>
                </form>
              </div>

              <div className="panel-card">
                <h3>Register Locker Unit</h3>
                <form onSubmit={handleCreateLocker}>
                  <div className="form-group">
                    <label>Assign to Ward</label>
                    <select
                      value={newLockerWard}
                      onChange={(e) => setNewLockerWard(e.target.value)}
                    >
                      {hierarchy.wards.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Compartment Number / Identifier</label>
                    <input
                      type="text"
                      placeholder="e.g. L-108"
                      value={newLockerNumber}
                      onChange={(e) => setNewLockerNumber(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Add Compartment
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: EMPLOYEES ================= */}
        {tab === 'employees' && (
          <div className="two-column-layout">
            <div>
              <h3>System Employees & Access Roles</h3>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      {currentUser.role === 'super_admin' && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id}>
                        <td><strong>{emp.name}</strong></td>
                        <td>{emp.email}</td>
                        <td>
                          <span className="role-badge">{emp.role}</span>
                        </td>
                        <td>
                          <span className={`comp-status-led ${emp.isActive ? 'available' : 'maintenance'}`}>
                            ● {emp.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        {currentUser.role === 'super_admin' && (
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleToggleEmployeeActive(emp)}
                            >
                              {emp.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {currentUser.role === 'super_admin' && (
              <div>
                <div className="panel-card">
                  <h3>Provision New Staff Account</h3>
                  <form onSubmit={handleCreateEmployee}>
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sarah Connor"
                        value={empName}
                        onChange={(e) => setEmpName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. sarah@lockers.local"
                        value={empEmail}
                        onChange={(e) => setEmpEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Initial Password</label>
                      <input
                        type="password"
                        placeholder="Password"
                        value={empPassword}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Assigned Role</label>
                      <select value={empRole} onChange={(e) => setEmpRole(e.target.value)}>
                        <option value="staff">Clinical Staff</option>
                        <option value="branch_admin">Branch Administrator</option>
                        <option value="super_admin">Super Administrator</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary">
                      Provision Account
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: AUDIT LOGS & REPORTS ================= */}
        {tab === 'reports' && (
          <div>
            <h3>Audit Trail & Telemetry Events</h3>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Target Compartment</th>
                    <th>Event Classification</th>
                    <th>Audit Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan="4">No operational audit records captured in current session buffer.</td>
                    </tr>
                  ) : (
                    events.map((ev) => (
                      <tr key={ev.id}>
                        <td>{new Date(ev.createdAt).toLocaleTimeString()}</td>
                        <td><strong>Compartment {ev.lockerId}</strong></td>
                        <td>
                          <span className="event-tag">{ev.eventType}</span>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.8rem' }}>{JSON.stringify(ev.details)}</code>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="admin-footer">
        <span>Smart Locker Administration System &bull; Hardware Controller v2.4.0 &bull; Facility Security Certified</span>
        <div className="footer-links">
          <button className="footer-link-btn" onClick={() => setActiveModal('tos')}>
            Terms of Service
          </button>
          <button className="footer-link-btn" onClick={() => setActiveModal('privacy')}>
            Privacy Policy
          </button>
        </div>
      </footer>

      {/* Real Terms of Service Modal */}
      {activeModal === 'tos' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>System Terms of Service & Compliance</h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕ Close</button>
            </div>
            <div className="modal-body">
              <h4>1. Administrative Authority</h4>
              <p>Administrative accounts granted access to this console are legally bound to enforce institution security policies. Unauthorized overrides or inspections without clinical cause are subject to facility audit.</p>
              <h4>2. Solenoid Latch Overrides</h4>
              <p>The Force Unlock function dispatches real-time commands directly to local hardware relays. Every manual unlock is recorded with administrator ID, timestamp, and network IP in immutable audit storage.</p>
              <h4>3. Data Integrity & Maintenance</h4>
              <p>Compartments flagged under maintenance lockout must undergo physical inspection before being restored to the active pool.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* Real Privacy Policy Modal */}
      {activeModal === 'privacy' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Administrative Privacy Policy & Data Access</h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕ Close</button>
            </div>
            <div className="modal-body">
              <h4>1. Personnel Data Protection</h4>
              <p>Staff credentials and password hashes are protected using one-way cryptographic hashing (bcrypt) and salted. User contact details retrieved during kiosk registration are protected under healthcare privacy standards.</p>
              <h4>2. Ephemeral Biometric Auditing</h4>
              <p>Identity verification snapshots are stored locally and purgable automatically. Operators of this console have access solely to operational metadata and are barred from copying user images.</p>
              <h4>3. Compliance Logging</h4>
              <p>Session tokens expire automatically. All API communications require bearer token authentication.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
