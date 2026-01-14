/**
 * Authentication Middleware
 * JWT verification and user context attachment
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../database/connection');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { logger } = require('../utils/logger');

/**
 * Verify JWT token and attach user to request
 */
async function authenticate(req, res, next) {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthenticationError('No authentication token provided');
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, config.jwt.secret);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new AuthenticationError('Token has expired');
            }
            if (err.name === 'JsonWebTokenError') {
                throw new AuthenticationError('Invalid token');
            }
            throw err;
        }
        
        // Fetch user from database
        const result = await query(
            `SELECT id, email, first_name, last_name, role, department_id, 
                    is_active, is_email_verified
             FROM users 
             WHERE id = $1`,
            [decoded.userId]
        );
        
        if (result.rows.length === 0) {
            throw new AuthenticationError('User not found');
        }
        
        const user = result.rows[0];
        
        // Check if user is active
        if (!user.is_active) {
            throw new AuthenticationError('User account is deactivated');
        }
        
        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            departmentId: user.department_id,
            isEmailVerified: user.is_email_verified
        };
        
        // Attach token info
        req.token = {
            iat: decoded.iat,
            exp: decoded.exp
        };
        
        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    
    return authenticate(req, res, next);
}

/**
 * Role-Based Access Control middleware factory
 * @param {...string} allowedRoles - Roles that can access the route
 */
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AuthenticationError('Authentication required'));
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            logger.warn('Authorization denied', {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                path: req.path
            });
            
            return next(new AuthorizationError(
                `This action requires one of the following roles: ${allowedRoles.join(', ')}`
            ));
        }
        
        next();
    };
}

/**
 * Check if user has access to a specific resource
 * @param {string} resourceUserId - Owner user ID of the resource
 * @param {Object} requestingUser - User making the request
 * @returns {boolean} True if access is granted
 */
function hasResourceAccess(resourceUserId, requestingUser) {
    // Admins can access everything
    if (requestingUser.role === 'admin') {
        return true;
    }
    
    // Users can access their own resources
    return resourceUserId === requestingUser.id;
}

/**
 * Middleware to check resource ownership
 * Used for routes where users can only modify their own data
 */
function checkOwnership(getUserIdFn) {
    return async (req, res, next) => {
        try {
            const resourceUserId = await getUserIdFn(req);
            
            if (!hasResourceAccess(resourceUserId, req.user)) {
                throw new AuthorizationError('You can only access your own resources');
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Department-based access control
 * Checks if user's department matches the resource's department
 */
function sameDepartment(getDepartmentIdFn) {
    return async (req, res, next) => {
        try {
            // Admins bypass department restrictions
            if (req.user.role === 'admin') {
                return next();
            }
            
            const resourceDepartmentId = await getDepartmentIdFn(req);
            
            if (resourceDepartmentId && resourceDepartmentId !== req.user.departmentId) {
                throw new AuthorizationError('This resource is restricted to its department');
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    authenticate,
    optionalAuth,
    authorize,
    hasResourceAccess,
    checkOwnership,
    sameDepartment
};
