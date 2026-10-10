import { Router } from 'express';
import dataStore from '../services/store.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// GET /api/employees - List employees
router.get('/', authenticateToken, authorizeRoles('super_admin', 'branch_admin'), (req, res) => {
  let employees = dataStore.getEmployees();
  if (req.user.role === 'branch_admin') {
    // Only return employees from this branch
    employees = employees.filter((e) => e.branchId === req.user.branchId);
  }
  res.json(employees);
});

// POST /api/employees - Create employee
router.post('/', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { name, email, password, role, branchId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const validRoles = ['super_admin', 'branch_admin', 'staff'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
  }

  try {
    const employee = dataStore.addEmployee({
      name,
      email,
      password,
      role: role || 'staff',
      branchId: branchId || 1
    });

    dataStore.logEvent('SYSTEM', 'EMPLOYEE_CREATED', {
      employeeId: employee.id,
      email: employee.email,
      role: employee.role,
      createdBy: req.user.email
    });

    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/employees/:id - Update status / role / details
router.patch('/:id', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updated = dataStore.updateEmployee(id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  dataStore.logEvent('SYSTEM', 'EMPLOYEE_UPDATED', {
    employeeId: id,
    updatedFields: Object.keys(updates),
    updatedBy: req.user.email
  });

  res.json(updated);
});

export default router;
