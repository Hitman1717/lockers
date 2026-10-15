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

    // 10 Lockers mapped to folders locker1 to locker10
    const initialOccupants = {
      1: { name: 'Aarav Sharma', phone: '+91-98765-00001' },
      2: { name: 'Priya Patel', phone: '+91-98765-00002' },
      4: { name: 'Rohan Verma', phone: '+91-98765-00004' },
      5: { name: 'Ananya Iyer', phone: '+91-98765-00005' },
      6: { name: 'Vikram Singh', phone: '+91-98765-00006' },
      7: { name: 'Sneha Reddy', phone: '+91-98765-00007' }
    };

    this.lockers = [];
    for (let i = 1; i <= 10; i++) {
      const isOccupied = initialOccupants[i] !== undefined;
      this.lockers.push({
        id: String(i),
        wardId: 1,
        lockerNumber: `Locker ${i}`,
        folderName: `locker${i}`,
        status: isOccupied ? 'occupied' : 'available',
        pin: isOccupied ? `${1000 + i}` : null,
        occupantName: isOccupied ? initialOccupants[i].name : null,
        occupantPhone: isOccupied ? initialOccupants[i].phone : null,
        occupantPhoto: isOccupied ? `/lockersInfo/locker${i}/image_1.jpg` : null,
        lastHeartbeat: new Date().toISOString(),
        batteryLevel: Math.floor(88 + Math.random() * 12)
      });
    }

    this.events = [
      {
        id: 1,
        lockerId: '1',
        eventType: 'REGISTRATION',
        details: { occupant: 'Aarav Sharma', action: 'Stored items in Locker 1' },
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 2,
        lockerId: '5',
        eventType: 'REGISTRATION',
        details: { occupant: 'Ananya Iyer', action: 'Stored items in Locker 5' },
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
    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase();
    const numMatch = cleanId.match(/(\d+)/);
    const num = numMatch ? numMatch[1] : null;

    return this.lockers.find((l) => {
      if (String(l.id).toLowerCase() === cleanId) return true;
      if (l.lockerNumber.toLowerCase() === cleanId) return true;
      if (l.folderName && l.folderName.toLowerCase() === cleanId) return true;
      if (num && String(l.id) === num) return true;
      return false;
    });
  }

  updateLocker(id, updates) {
    const locker = this.getLockerById(id);
    if (!locker) return null;
    const index = this.lockers.indexOf(locker);
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
