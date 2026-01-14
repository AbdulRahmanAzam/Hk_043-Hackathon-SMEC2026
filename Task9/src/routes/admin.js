/**
 * Admin Routes
 * Administrative endpoints for system management
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const approvalService = require('../services/approvalService');
const { getAuditLogs } = require('../services/auditService');

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    // Get various statistics
    const [bookingStats, resourceStats, userStats, pendingCount] = await Promise.all([
        query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'approved' AND start_time > NOW() THEN 1 END) as upcoming,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows
            FROM bookings
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `),
        query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_active THEN 1 END) as active,
                COUNT(CASE WHEN type = 'lab' THEN 1 END) as labs,
                COUNT(CASE WHEN type = 'hall' THEN 1 END) as halls,
                COUNT(CASE WHEN type = 'meeting_room' THEN 1 END) as meeting_rooms,
                COUNT(CASE WHEN type = 'equipment' THEN 1 END) as equipment
            FROM resources
        `),
        query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
                COUNT(CASE WHEN role = 'faculty' THEN 1 END) as faculty,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
                COUNT(CASE WHEN is_active THEN 1 END) as active
            FROM users
        `),
        query(`
            SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'
        `)
    ]);
    
    res.json({
        success: true,
        data: {
            bookings: {
                ...bookingStats.rows[0],
                period: 'Last 30 days'
            },
            resources: resourceStats.rows[0],
            users: userStats.rows[0],
            pendingApprovals: parseInt(pendingCount.rows[0].count, 10)
        }
    });
}));

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs
 * @access  Private (Admin only)
 */
router.get('/audit-logs', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const filters = {
        action: req.query.action,
        userId: req.query.userId,
        entityType: req.query.entityType,
        entityId: req.query.entityId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 50
    };
    
    const result = await getAuditLogs(filters);
    
    res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination
    });
}));

/**
 * @route   GET /api/admin/approval-rules
 * @desc    Get all approval rules
 * @access  Private (Admin only)
 */
router.get('/approval-rules', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const rules = await approvalService.getApprovalRules({
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
    });
    
    res.json({
        success: true,
        data: rules
    });
}));

/**
 * @route   POST /api/admin/approval-rules
 * @desc    Create a new approval rule
 * @access  Private (Admin only)
 */
router.post('/approval-rules', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const rule = await approvalService.createApprovalRule(req.body, req.user);
    
    res.status(201).json({
        success: true,
        message: 'Approval rule created',
        data: rule
    });
}));

/**
 * @route   PUT /api/admin/approval-rules/:id
 * @desc    Update an approval rule
 * @access  Private (Admin only)
 */
router.put('/approval-rules/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const rule = await approvalService.updateApprovalRule(req.params.id, req.body, req.user);
    
    res.json({
        success: true,
        message: 'Approval rule updated',
        data: rule
    });
}));

/**
 * @route   GET /api/admin/departments
 * @desc    Get all departments
 * @access  Private (Admin only)
 */
router.get('/departments', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT d.*, 
               u.email as head_email,
               u.first_name || ' ' || u.last_name as head_name,
               (SELECT COUNT(*) FROM users WHERE department_id = d.id) as member_count,
               (SELECT COUNT(*) FROM resources WHERE department_id = d.id) as resource_count
        FROM departments d
        LEFT JOIN users u ON d.head_user_id = u.id
        ORDER BY d.name
    `);
    
    res.json({
        success: true,
        data: result.rows
    });
}));

/**
 * @route   POST /api/admin/departments
 * @desc    Create a new department
 * @access  Private (Admin only)
 */
router.post('/departments', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { code, name, description, contactEmail, contactPhone, headUserId } = req.body;
    
    const result = await query(
        `INSERT INTO departments (code, name, description, contact_email, contact_phone, head_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [code, name, description, contactEmail, contactPhone, headUserId]
    );
    
    res.status(201).json({
        success: true,
        message: 'Department created',
        data: result.rows[0]
    });
}));

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get('/users', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { role, departmentId, isActive, page = 1, limit = 50 } = req.query;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;
    
    if (role) {
        conditions.push(`u.role = $${++paramCount}`);
        params.push(role);
    }
    
    if (departmentId) {
        conditions.push(`u.department_id = $${++paramCount}`);
        params.push(departmentId);
    }
    
    if (isActive !== undefined) {
        conditions.push(`u.is_active = $${++paramCount}`);
        params.push(isActive === 'true');
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10), offset);
    
    const result = await query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
               u.department_id, d.name as department_name,
               u.employee_id, u.is_active, u.is_email_verified, 
               u.last_login_at, u.created_at
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
    `, params);
    
    const countResult = await query(
        `SELECT COUNT(*) as total FROM users u ${whereClause}`,
        params.slice(0, -2)
    );
    
    res.json({
        success: true,
        data: result.rows,
        pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total: parseInt(countResult.rows[0].total, 10)
        }
    });
}));

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user (role, status, etc.)
 * @access  Private (Admin only)
 */
router.put('/users/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { role, isActive, departmentId } = req.body;
    const userId = req.params.id;
    
    const updates = [];
    const params = [];
    let paramCount = 0;
    
    if (role !== undefined) {
        updates.push(`role = $${++paramCount}`);
        params.push(role);
    }
    
    if (isActive !== undefined) {
        updates.push(`is_active = $${++paramCount}`);
        params.push(isActive);
    }
    
    if (departmentId !== undefined) {
        updates.push(`department_id = $${++paramCount}`);
        params.push(departmentId);
    }
    
    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'No fields to update' }
        });
    }
    
    params.push(userId);
    
    const result = await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING id, email, role, is_active`,
        params
    );
    
    if (result.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'User not found' }
        });
    }
    
    res.json({
        success: true,
        message: 'User updated',
        data: result.rows[0]
    });
}));

module.exports = router;
