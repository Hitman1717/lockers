import bcrypt from 'bcryptjs';

// Pre-hashed passwords for seed users (password: 'Admin123!', 'Branch123!', 'Staff123!')
const ADMIN_HASH = bcrypt.hashSync('Admin123!', 10);
const BRANCH_HASH = bcrypt.hashSync('Branch123!', 10);
const STAFF_HASH = bcrypt.hashSync('Staff123!', 10);

class LockerDataStore {
  constructor() {
    this.companies = [
      { id: 1, name: 'Apex Health Systems', createdAt: new Date().toISOString() }
    ];

    this.cities = [
      { id: 1, companyId: 1, name: 'Metro City', state: 'NY', createdAt: new Date().toISOString() },
      { id: 2, companyId: 1, name: 'West Valley', state: 'CA', createdAt: new Date().toISOString() }
    ];

    this.branches = [
      { id: 1, cityId: 1, name: 'Central Memorial Hospital', address: '100 Medical Plaza Blvd', createdAt: new Date().toISOString() },
      { id: 2, cityId: 2, name: 'Westside Community Clinic', address: '450 Sunset Ave', createdAt: new Date().toISOString() }
    ];

    this.wards = [
      { id: 1, branchId: 1, name: 'Ward 3A - Intensive Care', floor: '3rd Floor', createdAt: new Date().toISOString() },
      { id: 2, branchId: 1, name: 'Ward 1B - Emergency Room', floor: '1st Floor', createdAt: new Date().toISOString() },
      { id: 3, branchId: 2, name: 'Ward 2C - Outpatient Care', floor: '2nd Floor', createdAt: new Date().toISOString() }
    ];

    this.employees = [
      {
        id: 1,
        branchId: 1,
        name: 'Sarah Connor',
        email: 'admin@lockers.local',
        passwordHash: ADMIN_HASH,
        role: 'super_admin',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        branchId: 1,
        name: 'Michael Scott',
        email: 'branch@lockers.local',
        passwordHash: BRANCH_HASH,
        role: 'branch_admin',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        branchId: 1,
        name: 'Pam Beesly',
        email: 'staff@lockers.local',
        passwordHash: STAFF_HASH,
        role: 'staff',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    this.lockers = [
      {
        id: '101',
        wardId: 1,
        lockerNumber: 'L-101',
        status: 'available', // available, occupied, unlocked, maintenance, offline
        pin: null,
        occupantName: null,
        occupantPhone: null,
        occupantPhoto: null,
        lastHeartbeat: new Date().toISOString(),
        batteryLevel: 98
      },
      {
        id: '102',
        wardId: 1,
        lockerNumber: 'L-102',
        status: 'occupied',
        pin: '1234',
        occupantName: 'John Doe',
        occupantPhone: '+1-555-0102',
        occupantPhoto: null,
        lastHeartbeat: new Date().toISOString(),
        batteryLevel: 95
      },
      {
        id: '103',
        wardId: 1,
        lockerNumber: 'L-103',
        status: 'available',
        pin: null,
        occupantName: null,
        occupantPhone: null,
        occupantPhoto: null,
        lastHeartbeat: new Date().toISOString(),
        batteryLevel: 91
      },
      {
        id: '104',
        wardId: 1,
        lockerNumber: 'L-104',
        status: 'available',
        pin: null,
        occupantName: null,
        occupantPhone: null,
        occupantPhoto: null,
        lastHeartbeat: new Date().toISOString(),
        batteryLevel: 88
      },
      {
        id: '105',
        wardId: 1,
        lockerNumber: 'L-105',
        status: 'maintenance',
        pin: null,
        occupantName: null,
        occupantPhone: null,
        occupantPhoto: null,
        lastHeartbeat: new Date().toISOString(),
        batteryLevel: 42
      },
      {
        id: '201',
        wardId: 2,
        lockerNumber: 'L-201',
        status: 'available',
        pin: null,
        occupantName: null,
        occupantPhone: null,
        occupantPhoto: null,
        lastHeartbeat: new Date().toISOString(),
        batteryLevel: 97
      },
      {
        id: '202',
        wardId: 2,
        lockerNumber: 'L-202',
        status: 'occupied',
        pin: '4321',
        occupantName: 'Alice Smith',
        occupantPhone: '+1-555-0202',
        occupantPhoto: null,
        lastHeartbeat: new Date().toISOString(),
        batteryLevel: 93
      }
    ];

    this.events = [
      {
        id: 1,
        lockerId: '102',
        eventType: 'REGISTRATION',
        details: { occupant: 'John Doe', action: 'Stored items' },
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 2,
        lockerId: '105',
        eventType: 'MAINTENANCE_FLAG',
        details: { reason: 'Scheduled latch inspection' },
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];
  }

  // Locker operations
  getLockers(wardId = null) {
    if (wardId) {
      return this.lockers.filter((l) => l.wardId === parseInt(wardId, 10));
    }
    return this.lockers;
  }

  getLockerById(id) {
    return this.lockers.find((l) => String(l.id) === String(id) || l.lockerNumber === id);
  }

  updateLocker(id, updates) {
    const index = this.lockers.findIndex((l) => String(l.id) === String(id) || l.lockerNumber === id);
    if (index === -1) return null;
    this.lockers[index] = { ...this.lockers[index], ...updates };
    return this.lockers[index];
  }

  // Event logging
  logEvent(lockerId, eventType, details = {}) {
    const event = {
      id: this.events.length + 1,
      lockerId: String(lockerId),
      eventType,
      details,
      createdAt: new Date().toISOString()
    };
    this.events.unshift(event); // newest first
    // Limit to latest 500 events
    if (this.events.length > 500) {
      this.events.pop();
    }
    return event;
  }

  getEvents(limit = 50) {
    return this.events.slice(0, limit);
  }

  // Hierarchy
  getHierarchy() {
    return {
      companies: this.companies,
      cities: this.cities,
      branches: this.branches,
      wards: this.wards
    };
  }

  addCompany(name) {
    const comp = { id: this.companies.length + 1, name, createdAt: new Date().toISOString() };
    this.companies.push(comp);
    return comp;
  }

  addBranch(cityId, name, address) {
    const branch = {
      id: this.branches.length + 1,
      cityId: parseInt(cityId, 10),
      name,
      address,
      createdAt: new Date().toISOString()
    };
    this.branches.push(branch);
    return branch;
  }

  addWard(branchId, name, floor) {
    const ward = {
      id: this.wards.length + 1,
      branchId: parseInt(branchId, 10),
      name,
      floor,
      createdAt: new Date().toISOString()
    };
    this.wards.push(ward);
    return ward;
  }

  addLocker(wardId, lockerNumber) {
    const id = String(100 + this.lockers.length + 1);
    const locker = {
      id,
      wardId: parseInt(wardId, 10),
      lockerNumber,
      status: 'available',
      pin: null,
      occupantName: null,
      occupantPhone: null,
      occupantPhoto: null,
      lastHeartbeat: new Date().toISOString(),
      batteryLevel: 100
    };
    this.lockers.push(locker);
    return locker;
  }

  // Employee operations
  findEmployeeByEmail(email) {
    return this.employees.find((e) => e.email.toLowerCase() === email.toLowerCase());
  }

  findEmployeeById(id) {
    return this.employees.find((e) => e.id === parseInt(id, 10));
  }

  getEmployees() {
    return this.employees.map(({ passwordHash, ...safeEmployee }) => safeEmployee);
  }

  addEmployee({ name, email, password, role = 'staff', branchId = 1 }) {
    const existing = this.findEmployeeByEmail(email);
    if (existing) {
      throw new Error('Employee email already exists');
    }
    const passwordHash = bcrypt.hashSync(password, 10);
    const employee = {
      id: this.employees.length + 1,
      branchId: parseInt(branchId, 10),
      name,
      email,
      passwordHash,
      role,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.employees.push(employee);
    const { passwordHash: _, ...safe } = employee;
    return safe;
  }

  updateEmployee(id, updates) {
    const index = this.employees.findIndex((e) => e.id === parseInt(id, 10));
    if (index === -1) return null;

    if (updates.password) {
      updates.passwordHash = bcrypt.hashSync(updates.password, 10);
      delete updates.password;
    }

    this.employees[index] = { ...this.employees[index], ...updates };
    const { passwordHash, ...safe } = this.employees[index];
    return safe;
  }
}

export const dataStore = new LockerDataStore();
export default dataStore;
