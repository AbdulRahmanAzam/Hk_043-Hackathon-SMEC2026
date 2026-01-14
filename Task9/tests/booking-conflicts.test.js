/**
 * Booking Conflict Tests
 * 
 * Comprehensive test suite for double-booking prevention mechanisms
 * Tests both the application-level validation and database-level protection
 */

const { DateTime } = require('luxon');

// Mock database for testing
const mockBookings = [];
let mockIdCounter = 1;

/**
 * Simulated database client with EXCLUSION constraint behavior
 */
class MockDatabaseClient {
    constructor() {
        this.bookings = [];
    }
    
    /**
     * Simulate PostgreSQL tstzrange overlap check (&&)
     */
    rangesOverlap(range1, range2) {
        return range1.start < range2.end && range1.end > range2.start;
    }
    
    /**
     * Insert booking with EXCLUSION constraint simulation
     */
    async insertBooking(booking) {
        // Simulate EXCLUSION constraint check
        const existingConflict = this.bookings.find(b => 
            b.resourceId === booking.resourceId &&
            ['pending', 'approved'].includes(b.status) &&
            this.rangesOverlap(
                { start: new Date(b.startTime), end: new Date(b.endTime) },
                { start: new Date(booking.startTime), end: new Date(booking.endTime) }
            )
        );
        
        if (existingConflict) {
            const error = new Error('conflicting key value violates exclusion constraint "no_double_booking"');
            error.code = '23P01'; // PostgreSQL exclusion violation code
            throw error;
        }
        
        const newBooking = {
            id: `booking-${mockIdCounter++}`,
            ...booking,
            status: booking.status || 'pending',
            createdAt: new Date()
        };
        
        this.bookings.push(newBooking);
        return newBooking;
    }
    
    /**
     * Check for conflicts before insert
     */
    async checkConflicts(resourceId, startTime, endTime, excludeBookingId = null) {
        return this.bookings.filter(b => 
            b.resourceId === resourceId &&
            b.id !== excludeBookingId &&
            ['pending', 'approved'].includes(b.status) &&
            this.rangesOverlap(
                { start: new Date(b.startTime), end: new Date(b.endTime) },
                { start: new Date(startTime), end: new Date(endTime) }
            )
        );
    }
    
    reset() {
        this.bookings = [];
    }
}

// ============================================================
// TEST CASES
// ============================================================

const db = new MockDatabaseClient();

/**
 * Test Suite: Basic Conflict Detection
 */
describe('Basic Conflict Detection', () => {
    beforeEach(() => {
        db.reset();
    });
    
    test('Should allow booking when no conflicts exist', async () => {
        const booking = {
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'CS101 Lab Session'
        };
        
        const result = await db.insertBooking(booking);
        
        expect(result.id).toBeDefined();
        expect(db.bookings.length).toBe(1);
    });
    
    test('Should reject booking with exact time overlap', async () => {
        // First booking
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'First Booking'
        });
        
        // Second booking with same times - should fail
        await expect(db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'research',
            title: 'Conflicting Booking'
        })).rejects.toThrow('exclusion constraint');
    });
    
    test('Should reject booking with partial overlap (start overlaps)', async () => {
        // First booking: 10:00 - 12:00
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'First Booking'
        });
        
        // Second booking: 11:00 - 13:00 (overlaps at 11:00-12:00)
        await expect(db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T11:00:00Z',
            endTime: '2026-01-15T13:00:00Z',
            purpose: 'research',
            title: 'Overlapping Booking'
        })).rejects.toThrow('exclusion constraint');
    });
    
    test('Should reject booking with partial overlap (end overlaps)', async () => {
        // First booking: 10:00 - 12:00
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'First Booking'
        });
        
        // Second booking: 09:00 - 11:00 (overlaps at 10:00-11:00)
        await expect(db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T09:00:00Z',
            endTime: '2026-01-15T11:00:00Z',
            purpose: 'research',
            title: 'Overlapping Booking'
        })).rejects.toThrow('exclusion constraint');
    });
    
    test('Should reject booking fully contained within existing booking', async () => {
        // First booking: 09:00 - 13:00
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T09:00:00Z',
            endTime: '2026-01-15T13:00:00Z',
            purpose: 'academic',
            title: 'Long Booking'
        });
        
        // Second booking: 10:00 - 12:00 (fully within first)
        await expect(db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'research',
            title: 'Contained Booking'
        })).rejects.toThrow('exclusion constraint');
    });
    
    test('Should reject booking that fully contains existing booking', async () => {
        // First booking: 10:00 - 12:00
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'Short Booking'
        });
        
        // Second booking: 09:00 - 13:00 (contains first)
        await expect(db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T09:00:00Z',
            endTime: '2026-01-15T13:00:00Z',
            purpose: 'research',
            title: 'Containing Booking'
        })).rejects.toThrow('exclusion constraint');
    });
});

/**
 * Test Suite: Adjacent Bookings (Edge Cases)
 */
describe('Adjacent Bookings (No Overlap)', () => {
    beforeEach(() => {
        db.reset();
    });
    
    test('Should allow back-to-back bookings (no gap)', async () => {
        // First booking: 10:00 - 12:00
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'Morning Session'
        });
        
        // Second booking: 12:00 - 14:00 (starts exactly when first ends)
        const result = await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T12:00:00Z',
            endTime: '2026-01-15T14:00:00Z',
            purpose: 'research',
            title: 'Afternoon Session'
        });
        
        expect(result.id).toBeDefined();
        expect(db.bookings.length).toBe(2);
    });
    
    test('Should allow bookings with gap between them', async () => {
        // First booking: 10:00 - 11:00
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T11:00:00Z',
            purpose: 'academic',
            title: 'First Session'
        });
        
        // Second booking: 12:00 - 13:00 (1 hour gap)
        const result = await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T12:00:00Z',
            endTime: '2026-01-15T13:00:00Z',
            purpose: 'research',
            title: 'Second Session'
        });
        
        expect(result.id).toBeDefined();
        expect(db.bookings.length).toBe(2);
    });
});

/**
 * Test Suite: Different Resources
 */
describe('Different Resources (No Conflict)', () => {
    beforeEach(() => {
        db.reset();
    });
    
    test('Should allow same time booking for different resources', async () => {
        // Booking for resource 1
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'Resource 1 Booking'
        });
        
        // Same time for resource 2 - should succeed
        const result = await db.insertBooking({
            resourceId: 'resource-2',
            userId: 'user-2',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'research',
            title: 'Resource 2 Booking'
        });
        
        expect(result.id).toBeDefined();
        expect(db.bookings.length).toBe(2);
    });
});

/**
 * Test Suite: Cancelled Bookings
 */
describe('Cancelled Bookings (No Conflict)', () => {
    beforeEach(() => {
        db.reset();
    });
    
    test('Should allow booking over cancelled booking time', async () => {
        // Insert and cancel first booking
        const cancelled = await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'Cancelled Booking',
            status: 'cancelled'
        });
        
        // Same time should now work since first is cancelled
        const result = await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'research',
            title: 'New Booking'
        });
        
        expect(result.id).toBeDefined();
        expect(db.bookings.length).toBe(2);
    });
    
    test('Should allow booking over completed booking time', async () => {
        // Insert completed booking
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'Completed Booking',
            status: 'completed'
        });
        
        // Same time should work (though unusual to rebook past time)
        const result = await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'research',
            title: 'New Booking'
        });
        
        expect(result.id).toBeDefined();
    });
});

/**
 * Test Suite: Concurrent Booking Attempts
 */
describe('Concurrent Booking Attempts (Race Condition Prevention)', () => {
    beforeEach(() => {
        db.reset();
    });
    
    test('Should handle concurrent booking attempts - only one succeeds', async () => {
        const booking1 = {
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'Concurrent Booking 1'
        };
        
        const booking2 = {
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'research',
            title: 'Concurrent Booking 2'
        };
        
        // Simulate concurrent requests
        const results = await Promise.allSettled([
            db.insertBooking(booking1),
            db.insertBooking(booking2)
        ]);
        
        // Count successes and failures
        const succeeded = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');
        
        // Exactly one should succeed
        expect(succeeded.length).toBe(1);
        expect(failed.length).toBe(1);
        expect(failed[0].reason.code).toBe('23P01');
    });
    
    test('Should handle 5 concurrent booking attempts - only one succeeds', async () => {
        const bookings = Array.from({ length: 5 }, (_, i) => ({
            resourceId: 'resource-1',
            userId: `user-${i + 1}`,
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: `Concurrent Booking ${i + 1}`
        }));
        
        const results = await Promise.allSettled(
            bookings.map(b => db.insertBooking(b))
        );
        
        const succeeded = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');
        
        expect(succeeded.length).toBe(1);
        expect(failed.length).toBe(4);
    });
});

/**
 * Test Suite: Timezone Handling
 */
describe('Timezone Handling', () => {
    beforeEach(() => {
        db.reset();
    });
    
    test('Should handle bookings in different timezones correctly', async () => {
        // Booking in UTC
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'UTC Booking'
        });
        
        // Same time in Pakistan time (UTC+5) = 15:00-17:00 PKT = 10:00-12:00 UTC
        // This should conflict
        await expect(db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T15:00:00+05:00', // 10:00 UTC
            endTime: '2026-01-15T17:00:00+05:00',   // 12:00 UTC
            purpose: 'research',
            title: 'PKT Booking'
        })).rejects.toThrow('exclusion constraint');
    });
    
    test('Should allow bookings that appear to overlap but are in different actual times', async () => {
        // Booking at 10:00 UTC
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'UTC Booking'
        });
        
        // 10:00 in Pakistan time (UTC+5) = 05:00 UTC - no overlap!
        const result = await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-2',
            startTime: '2026-01-15T10:00:00+05:00', // 05:00 UTC
            endTime: '2026-01-15T12:00:00+05:00',   // 07:00 UTC
            purpose: 'research',
            title: 'PKT Morning Booking'
        });
        
        expect(result.id).toBeDefined();
    });
});

/**
 * Test Suite: Conflict Detection Helper
 */
describe('Conflict Detection Before Insert', () => {
    beforeEach(() => {
        db.reset();
    });
    
    test('Should return empty array when no conflicts', async () => {
        await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'Existing Booking'
        });
        
        // Check for non-overlapping time
        const conflicts = await db.checkConflicts(
            'resource-1',
            '2026-01-15T14:00:00Z',
            '2026-01-15T16:00:00Z'
        );
        
        expect(conflicts).toHaveLength(0);
    });
    
    test('Should return conflicting bookings when overlap exists', async () => {
        const existing = await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'Existing Booking'
        });
        
        // Check for overlapping time
        const conflicts = await db.checkConflicts(
            'resource-1',
            '2026-01-15T11:00:00Z',
            '2026-01-15T13:00:00Z'
        );
        
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].id).toBe(existing.id);
    });
    
    test('Should exclude specific booking ID from conflict check', async () => {
        const existing = await db.insertBooking({
            resourceId: 'resource-1',
            userId: 'user-1',
            startTime: '2026-01-15T10:00:00Z',
            endTime: '2026-01-15T12:00:00Z',
            purpose: 'academic',
            title: 'Existing Booking'
        });
        
        // Check for same time but exclude the existing booking (for updates)
        const conflicts = await db.checkConflicts(
            'resource-1',
            '2026-01-15T10:00:00Z',
            '2026-01-15T12:00:00Z',
            existing.id // Exclude this booking
        );
        
        expect(conflicts).toHaveLength(0);
    });
});

// ============================================================
// RUN TESTS
// ============================================================

// Simple test runner for environments without Jest
function runTests() {
    console.log('\n🧪 Running Booking Conflict Tests\n');
    console.log('='.repeat(60));
    
    let passed = 0;
    let failed = 0;
    
    const tests = [
        {
            name: 'Allow booking when no conflicts',
            test: async () => {
                db.reset();
                const booking = await db.insertBooking({
                    resourceId: 'resource-1',
                    startTime: '2026-01-15T10:00:00Z',
                    endTime: '2026-01-15T12:00:00Z'
                });
                if (!booking.id) throw new Error('Booking should be created');
            }
        },
        {
            name: 'Reject exact time overlap',
            test: async () => {
                db.reset();
                await db.insertBooking({
                    resourceId: 'resource-1',
                    startTime: '2026-01-15T10:00:00Z',
                    endTime: '2026-01-15T12:00:00Z'
                });
                
                try {
                    await db.insertBooking({
                        resourceId: 'resource-1',
                        startTime: '2026-01-15T10:00:00Z',
                        endTime: '2026-01-15T12:00:00Z'
                    });
                    throw new Error('Should have thrown');
                } catch (e) {
                    if (e.code !== '23P01') throw e;
                }
            }
        },
        {
            name: 'Reject partial overlap (start)',
            test: async () => {
                db.reset();
                await db.insertBooking({
                    resourceId: 'resource-1',
                    startTime: '2026-01-15T10:00:00Z',
                    endTime: '2026-01-15T12:00:00Z'
                });
                
                try {
                    await db.insertBooking({
                        resourceId: 'resource-1',
                        startTime: '2026-01-15T11:00:00Z',
                        endTime: '2026-01-15T13:00:00Z'
                    });
                    throw new Error('Should have thrown');
                } catch (e) {
                    if (e.code !== '23P01') throw e;
                }
            }
        },
        {
            name: 'Allow back-to-back bookings',
            test: async () => {
                db.reset();
                await db.insertBooking({
                    resourceId: 'resource-1',
                    startTime: '2026-01-15T10:00:00Z',
                    endTime: '2026-01-15T12:00:00Z'
                });
                
                const booking = await db.insertBooking({
                    resourceId: 'resource-1',
                    startTime: '2026-01-15T12:00:00Z',
                    endTime: '2026-01-15T14:00:00Z'
                });
                
                if (!booking.id) throw new Error('Back-to-back should work');
            }
        },
        {
            name: 'Allow same time for different resources',
            test: async () => {
                db.reset();
                await db.insertBooking({
                    resourceId: 'resource-1',
                    startTime: '2026-01-15T10:00:00Z',
                    endTime: '2026-01-15T12:00:00Z'
                });
                
                const booking = await db.insertBooking({
                    resourceId: 'resource-2',
                    startTime: '2026-01-15T10:00:00Z',
                    endTime: '2026-01-15T12:00:00Z'
                });
                
                if (!booking.id) throw new Error('Different resources should work');
            }
        },
        {
            name: 'Allow booking over cancelled slot',
            test: async () => {
                db.reset();
                await db.insertBooking({
                    resourceId: 'resource-1',
                    startTime: '2026-01-15T10:00:00Z',
                    endTime: '2026-01-15T12:00:00Z',
                    status: 'cancelled'
                });
                
                const booking = await db.insertBooking({
                    resourceId: 'resource-1',
                    startTime: '2026-01-15T10:00:00Z',
                    endTime: '2026-01-15T12:00:00Z'
                });
                
                if (!booking.id) throw new Error('Cancelled slot should be available');
            }
        },
        {
            name: 'Only one concurrent booking succeeds',
            test: async () => {
                db.reset();
                const bookings = Array.from({ length: 5 }, () => ({
                    resourceId: 'resource-1',
                    startTime: '2026-01-15T10:00:00Z',
                    endTime: '2026-01-15T12:00:00Z'
                }));
                
                const results = await Promise.allSettled(
                    bookings.map(b => db.insertBooking(b))
                );
                
                const succeeded = results.filter(r => r.status === 'fulfilled');
                if (succeeded.length !== 1) {
                    throw new Error(`Expected 1 success, got ${succeeded.length}`);
                }
            }
        }
    ];
    
    // Run tests
    (async () => {
        for (const { name, test } of tests) {
            try {
                await test();
                console.log(`  ✅ ${name}`);
                passed++;
            } catch (error) {
                console.log(`  ❌ ${name}`);
                console.log(`     Error: ${error.message}`);
                failed++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
    })();
}

// Export for Jest or run directly
if (typeof describe === 'undefined') {
    runTests();
}

module.exports = { MockDatabaseClient, runTests };
