/**
 * Analytics Routes
 * Provides endpoints for utilization analytics, heatmaps, and dashboard data
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/errors');
const analyticsService = require('../services/analyticsService');

/**
 * GET /api/analytics/utilization/:resourceId
 * Get resource utilization statistics
 */
router.get('/utilization/:resourceId', 
    authenticate, 
    authorize('admin', 'faculty'),
    asyncHandler(async (req, res) => {
        const { resourceId } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            throw new ValidationError('startDate and endDate are required');
        }
        
        const utilization = await analyticsService.getResourceUtilization(
            resourceId, 
            new Date(startDate), 
            new Date(endDate)
        );
        
        res.json({
            success: true,
            data: utilization
        });
    })
);

/**
 * GET /api/analytics/heatmap/:resourceId
 * Get availability heatmap for a resource
 */
router.get('/heatmap/:resourceId', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { resourceId } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            throw new ValidationError('startDate and endDate are required');
        }
        
        const heatmap = await analyticsService.getAvailabilityHeatmap(
            resourceId, 
            new Date(startDate), 
            new Date(endDate)
        );
        
        res.json({
            success: true,
            data: heatmap
        });
    })
);

/**
 * GET /api/analytics/dashboard
 * Get dashboard analytics summary
 */
router.get('/dashboard', 
    authenticate, 
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        
        const dashboard = await analyticsService.getDashboardAnalytics(start, end);
        
        res.json({
            success: true,
            data: dashboard
        });
    })
);

/**
 * GET /api/analytics/idle-time
 * Get idle time analysis for resources
 */
router.get('/idle-time', 
    authenticate, 
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const { startDate, endDate, resourceType } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        
        const idleAnalysis = await analyticsService.getIdleTimeAnalysis(start, end, resourceType);
        
        res.json({
            success: true,
            data: idleAnalysis
        });
    })
);

/**
 * GET /api/analytics/peak-usage
 * Get peak usage analysis
 */
router.get('/peak-usage', 
    authenticate, 
    authorize('admin', 'faculty'),
    asyncHandler(async (req, res) => {
        const { startDate, endDate, resourceId } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        
        const peakUsage = await analyticsService.getPeakUsageAnalysis(start, end, resourceId);
        
        res.json({
            success: true,
            data: peakUsage
        });
    })
);

module.exports = router;
