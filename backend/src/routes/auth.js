import { Router } from 'express';
import bcrypt from 'bcryptjs';
import dataStore from '../services/store.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const employee = dataStore.findEmployeeByEmail(email);
  if (!employee) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!employee.isActive) {
    return res.status(403).json({ error: 'Account is deactivated. Contact an administrator.' });
  }

  const passwordValid = bcrypt.compareSync(password, employee.passwordHash);
  if (!passwordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { passwordHash, ...safeUser } = employee;
  const token = generateToken(safeUser);

  dataStore.logEvent('SYSTEM', 'USER_LOGIN', {
    userId: safeUser.id,
    email: safeUser.email,
    role: safeUser.role
  });

  res.json({
    token,
    user: safeUser
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const employee = dataStore.findEmployeeById(req.user.id);
  if (!employee || !employee.isActive) {
    return res.status(404).json({ error: 'User not found or inactive' });
  }
  const { passwordHash, ...safeUser } = employee;
  res.json({ user: safeUser });
});

// Helper for testing: GET /api/auth/demo-accounts
router.get('/demo-accounts', (req, res) => {
  res.json({
    accounts: [
      { role: 'Super Admin', email: 'admin@lockers.local', password: 'Admin123!' },
      { role: 'Branch Admin', email: 'branch@lockers.local', password: 'Branch123!' },
      { role: 'Staff Member', email: 'staff@lockers.local', password: 'Staff123!' }
    ]
  });
});

export default router;
