const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { isValidUniversityEmail, apiResponse } = require('../utils/helpers');
require('dotenv').config();

/**
 * User Signup
 */
exports.signup = async (req, res) => {
    try {
        const { email, password, name, department, semester, gender, role, phone, show_gender } = req.body;

        // Validate university email
        const emailCheck = isValidUniversityEmail(email);
        if (!emailCheck.valid) {
            return apiResponse(res, 400, false, emailCheck.message);
        }

        // Check for duplicate email
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
        if (existingUser) {
            return apiResponse(res, 409, false, 'An account with this email already exists');
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const userId = uuidv4();
        const insertUser = db.prepare(`
            INSERT INTO users (id, email, password, name, university, department, semester, gender, show_gender, role, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertUser.run(
            userId,
            email.toLowerCase(),
            hashedPassword,
            name,
            emailCheck.university,
            department || null,
            semester || null,
            gender || 'prefer_not_to_say',
            show_gender ? 1 : 0,
            role || 'rider',
            phone || null
        );

        // Generate JWT
        const token = jwt.sign(
            { id: userId, email: email.toLowerCase(), role: role || 'rider' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return apiResponse(res, 201, true, 'Account created successfully', {
            token,
            user: {
                id: userId,
                email: email.toLowerCase(),
                name,
                university: emailCheck.university,
                department,
                semester,
                role: role || 'rider'
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        return apiResponse(res, 500, false, 'An error occurred during signup. Please try again.');
    }
};

/**
 * User Login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
        
        if (!user) {
            return apiResponse(res, 401, false, 'Invalid email or password');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return apiResponse(res, 401, false, 'Invalid email or password');
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return apiResponse(res, 200, true, 'Login successful', {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                university: user.university,
                department: user.department,
                semester: user.semester,
                role: user.role,
                average_rating: user.average_rating,
                rides_completed: user.rides_completed
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return apiResponse(res, 500, false, 'An error occurred during login. Please try again.');
    }
};

/**
 * Get Current User Profile
 */
exports.getProfile = async (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, email, name, university, department, semester, gender, show_gender, 
                   role, phone, average_rating, total_ratings, rides_completed, 
                   rides_cancelled, no_shows, created_at
            FROM users WHERE id = ?
        `).get(req.user.id);

        if (!user) {
            return apiResponse(res, 404, false, 'User not found');
        }

        // Don't show gender if user chose to hide it
        if (!user.show_gender) {
            delete user.gender;
        }

        return apiResponse(res, 200, true, 'Profile retrieved successfully', { user });

    } catch (error) {
        console.error('Get profile error:', error);
        return apiResponse(res, 500, false, 'Failed to retrieve profile');
    }
};

/**
 * Update User Profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const { name, department, semester, gender, show_gender, role, phone } = req.body;
        
        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }
        if (department !== undefined) {
            updates.push('department = ?');
            params.push(department);
        }
        if (semester !== undefined) {
            updates.push('semester = ?');
            params.push(semester);
        }
        if (gender !== undefined) {
            updates.push('gender = ?');
            params.push(gender);
        }
        if (show_gender !== undefined) {
            updates.push('show_gender = ?');
            params.push(show_gender ? 1 : 0);
        }
        if (role !== undefined) {
            updates.push('role = ?');
            params.push(role);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            params.push(phone);
        }

        if (updates.length === 0) {
            return apiResponse(res, 400, false, 'No fields to update');
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(req.user.id);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        db.prepare(query).run(...params);

        // Return updated profile
        const updatedUser = db.prepare(`
            SELECT id, email, name, university, department, semester, gender, show_gender, 
                   role, phone, average_rating, rides_completed
            FROM users WHERE id = ?
        `).get(req.user.id);

        return apiResponse(res, 200, true, 'Profile updated successfully', { user: updatedUser });

    } catch (error) {
        console.error('Update profile error:', error);
        return apiResponse(res, 500, false, 'Failed to update profile');
    }
};

/**
 * Get User Statistics
 */
exports.getUserStats = async (req, res) => {
    try {
        const user = db.prepare(`
            SELECT rides_completed, rides_cancelled, no_shows, 
                   average_rating, total_ratings
            FROM users WHERE id = ?
        `).get(req.user.id);

        if (!user) {
            return apiResponse(res, 404, false, 'User not found');
        }

        // Get additional stats
        const ridesAsDriver = db.prepare(`
            SELECT COUNT(*) as count FROM rides WHERE driver_id = ?
        `).get(req.user.id);

        const ridesAsRider = db.prepare(`
            SELECT COUNT(*) as count FROM bookings WHERE rider_id = ? AND status = 'completed'
        `).get(req.user.id);

        const stats = {
            ...user,
            rides_posted: ridesAsDriver.count,
            rides_taken: ridesAsRider.count
        };

        return apiResponse(res, 200, true, 'Stats retrieved successfully', { stats });

    } catch (error) {
        console.error('Get stats error:', error);
        return apiResponse(res, 500, false, 'Failed to retrieve stats');
    }
};
