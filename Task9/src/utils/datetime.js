/**
 * DateTime Utilities
 * Centralized date/time handling with timezone support
 * 
 * CRITICAL: All internal operations use UTC
 * Timezone conversion happens only at API boundaries
 */

const { DateTime, Duration, Interval } = require('luxon');
const config = require('../config');

const DEFAULT_TIMEZONE = config.timezone || 'UTC';

/**
 * Parse and validate an ISO 8601 date string
 * @param {string} dateString - ISO 8601 formatted date string
 * @param {string} timezone - Target timezone (default from config)
 * @returns {DateTime|null} Luxon DateTime object or null if invalid
 */
function parseISO(dateString, timezone = DEFAULT_TIMEZONE) {
    if (!dateString) return null;
    
    const dt = DateTime.fromISO(dateString, { zone: timezone });
    
    if (!dt.isValid) {
        return null;
    }
    
    return dt;
}

/**
 * Validate that a string is a valid ISO 8601 date format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid
 */
function isValidISO(dateString) {
    if (!dateString || typeof dateString !== 'string') return false;
    
    // Strict ISO 8601 regex
    const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?)?$/;
    
    if (!isoRegex.test(dateString)) return false;
    
    const dt = DateTime.fromISO(dateString);
    return dt.isValid;
}

/**
 * Convert any DateTime to UTC
 * @param {DateTime|string} dt - DateTime object or ISO string
 * @returns {DateTime} DateTime in UTC
 */
function toUTC(dt) {
    if (typeof dt === 'string') {
        dt = parseISO(dt);
    }
    return dt?.toUTC();
}

/**
 * Convert UTC DateTime to a specific timezone
 * @param {DateTime|string} dt - DateTime object or ISO string
 * @param {string} timezone - Target timezone
 * @returns {DateTime} DateTime in target timezone
 */
function toTimezone(dt, timezone = DEFAULT_TIMEZONE) {
    if (typeof dt === 'string') {
        dt = parseISO(dt);
    }
    return dt?.setZone(timezone);
}

/**
 * Get current timestamp in UTC
 * @returns {DateTime} Current UTC DateTime
 */
function nowUTC() {
    return DateTime.utc();
}

/**
 * Get current timestamp in default timezone
 * @returns {DateTime} Current DateTime in default timezone
 */
function now() {
    return DateTime.now().setZone(DEFAULT_TIMEZONE);
}

/**
 * Format DateTime to ISO string (always UTC)
 * @param {DateTime} dt - DateTime object
 * @returns {string} ISO 8601 formatted string
 */
function toISOString(dt) {
    return dt?.toUTC().toISO();
}

/**
 * Create a PostgreSQL tstzrange from start and end times
 * @param {DateTime|string} start - Start time
 * @param {DateTime|string} end - End time
 * @returns {string} PostgreSQL tstzrange string
 */
function toTstzrange(start, end) {
    const startUTC = typeof start === 'string' ? parseISO(start)?.toUTC() : start.toUTC();
    const endUTC = typeof end === 'string' ? parseISO(end)?.toUTC() : end.toUTC();
    
    if (!startUTC || !endUTC) {
        throw new Error('Invalid start or end time');
    }
    
    // PostgreSQL tstzrange format: '[start, end)'
    return `[${startUTC.toISO()}, ${endUTC.toISO()})`;
}

/**
 * Check if two time ranges overlap
 * @param {Object} range1 - First range {start, end}
 * @param {Object} range2 - Second range {start, end}
 * @returns {boolean} True if ranges overlap
 */
function rangesOverlap(range1, range2) {
    const start1 = typeof range1.start === 'string' ? parseISO(range1.start) : range1.start;
    const end1 = typeof range1.end === 'string' ? parseISO(range1.end) : range1.end;
    const start2 = typeof range2.start === 'string' ? parseISO(range2.start) : range2.start;
    const end2 = typeof range2.end === 'string' ? parseISO(range2.end) : range2.end;
    
    const interval1 = Interval.fromDateTimes(start1, end1);
    const interval2 = Interval.fromDateTimes(start2, end2);
    
    return interval1.overlaps(interval2);
}

/**
 * Calculate duration in minutes between two times
 * @param {DateTime|string} start - Start time
 * @param {DateTime|string} end - End time
 * @returns {number} Duration in minutes
 */
function getDurationMinutes(start, end) {
    const startDT = typeof start === 'string' ? parseISO(start) : start;
    const endDT = typeof end === 'string' ? parseISO(end) : end;
    
    return endDT.diff(startDT, 'minutes').minutes;
}

/**
 * Check if a time is within business hours
 * @param {DateTime|string} dt - DateTime to check
 * @param {string} startTime - Start time (HH:mm)
 * @param {string} endTime - End time (HH:mm)
 * @returns {boolean} True if within hours
 */
function isWithinHours(dt, startTime, endTime) {
    const dateTime = typeof dt === 'string' ? parseISO(dt) : dt;
    const localDT = dateTime.setZone(DEFAULT_TIMEZONE);
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const timeMinutes = localDT.hour * 60 + localDT.minute;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Validate that start time is before end time
 * @param {string} start - Start ISO string
 * @param {string} end - End ISO string
 * @returns {boolean} True if valid
 */
function isValidTimeRange(start, end) {
    const startDT = parseISO(start);
    const endDT = parseISO(end);
    
    if (!startDT || !endDT) return false;
    
    return startDT < endDT;
}

/**
 * Check if a datetime is in the future
 * @param {DateTime|string} dt - DateTime to check
 * @returns {boolean} True if in future
 */
function isFuture(dt) {
    const dateTime = typeof dt === 'string' ? parseISO(dt) : dt;
    return dateTime > nowUTC();
}

/**
 * Get day of week (0-6, where 0 is Sunday)
 * @param {DateTime|string} dt - DateTime
 * @returns {number} Day of week
 */
function getDayOfWeek(dt) {
    const dateTime = typeof dt === 'string' ? parseISO(dt) : dt;
    return dateTime.weekday % 7; // Luxon uses 1-7 (Mon-Sun), convert to 0-6 (Sun-Sat)
}

/**
 * Add duration to a datetime
 * @param {DateTime|string} dt - Base datetime
 * @param {Object} duration - Duration object {hours, minutes, days}
 * @returns {DateTime} New datetime
 */
function addDuration(dt, duration) {
    const dateTime = typeof dt === 'string' ? parseISO(dt) : dt;
    return dateTime.plus(Duration.fromObject(duration));
}

module.exports = {
    DEFAULT_TIMEZONE,
    parseISO,
    isValidISO,
    toUTC,
    toTimezone,
    nowUTC,
    now,
    toISOString,
    toTstzrange,
    rangesOverlap,
    getDurationMinutes,
    isWithinHours,
    isValidTimeRange,
    isFuture,
    getDayOfWeek,
    addDuration
};
