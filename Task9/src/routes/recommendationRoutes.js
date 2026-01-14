/**
 * Recommendation Routes
 * Provides endpoints for smart slot recommendations
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/errors');
const recommendationService = require('../services/recommendationService');

/**
 * GET /api/recommendations/slots/:resourceId
 * Get smart slot recommendations for a resource
 */
router.get('/slots/:resourceId', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { resourceId } = req.params;
        const { 
            date,
            preferredDuration,
            preferredHour,
            limit = 5
        } = req.query;
        
        const targetDate = date ? new Date(date) : new Date();
        
        const recommendations = await recommendationService.getSmartRecommendations(
            resourceId,
            targetDate,
            {
                preferredDuration: preferredDuration ? parseInt(preferredDuration) : null,
                preferredHour: preferredHour ? parseInt(preferredHour) : null,
                limit: parseInt(limit)
            }
        );
        
        res.json({
            success: true,
            data: recommendations
        });
    })
);

/**
 * GET /api/recommendations/alternatives
 * Get alternative slots when a preferred time is not available
 */
router.get('/alternatives', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { 
            resourceId,
            startTime,
            endTime,
            limit = 3
        } = req.query;
        
        if (!resourceId || !startTime || !endTime) {
            throw new ValidationError('resourceId, startTime, and endTime are required');
        }
        
        const alternatives = await recommendationService.getAlternativeSlots(
            resourceId,
            new Date(startTime),
            new Date(endTime),
            parseInt(limit)
        );
        
        res.json({
            success: true,
            data: alternatives
        });
    })
);

/**
 * GET /api/recommendations/demand/:resourceId
 * Get demand level for a specific slot
 */
router.get('/demand/:resourceId', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { resourceId } = req.params;
        const { startTime, endTime } = req.query;
        
        if (!startTime || !endTime) {
            throw new ValidationError('startTime and endTime are required');
        }
        
        const demandLevel = await recommendationService.getSlotDemandLevel(
            resourceId,
            new Date(startTime),
            new Date(endTime)
        );
        
        res.json({
            success: true,
            data: { demandLevel }
        });
    })
);

/**
 * POST /api/recommendations/refresh
 * Manually refresh recommendations (admin only)
 */
router.post('/refresh', 
    authenticate,
    asyncHandler(async (req, res) => {
        if (req.user.role !== 'admin') {
            throw new ValidationError('Only admins can refresh recommendations');
        }
        
        await recommendationService.analyzeAndUpdateRecommendations();
        
        res.json({
            success: true,
            message: 'Recommendations refreshed successfully'
        });
    })
);

module.exports = router;
