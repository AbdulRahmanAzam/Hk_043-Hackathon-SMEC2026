/**
 * Database Seeder for MongoDB
 * Run: node src/database/seed.js
 * 
 * Creates sample users, resources, and bookings for testing
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import models
const { User, Resource, Booking } = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus_resource_db';

// Sample Users
const users = [
  {
    email: 'admin@campus.edu',
    password: 'Demo123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    department: 'Administration',
    employeeId: 'ADM001',
  },
  {
    email: 'faculty@campus.edu',
    password: 'Demo123!',
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    role: 'faculty',
    department: 'Computer Science',
    employeeId: 'FAC001',
  },
  {
    email: 'student@campus.edu',
    password: 'Demo123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'student',
    department: 'Computer Science',
    employeeId: 'CS2024001',
  },
  {
    email: 'student2@campus.edu',
    password: 'Demo123!',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'student',
    department: 'Electrical Engineering',
    employeeId: 'EE2024002',
  },
];

// Sample Resources
const resources = [
  {
    name: 'Computer Lab A',
    code: 'LAB-A1',
    type: 'lab',
    capacity: 40,
    location: 'Building A, Floor 2',
    building: 'Building A',
    floor: 2,
    amenities: ['Computers', 'Projector', 'Whiteboard', 'AC'],
    equipment: ['40 Desktop PCs', 'Network Switches', 'Printer'],
    operatingHours: { start: '08:00', end: '20:00' },
    isActive: true,
    requiresApproval: false,
    minBookingDuration: 30,
    maxBookingDuration: 180,
    bookingRules: {
      maxAdvanceBookingDays: 14,
      minNoticePeriodHours: 2,
      allowRecurring: true,
    },
  },
  {
    name: 'Computer Lab B',
    code: 'LAB-B2',
    type: 'lab',
    capacity: 30,
    location: 'Building A, Floor 3',
    building: 'Building A',
    floor: 3,
    amenities: ['Computers', 'Projector', 'AC'],
    equipment: ['30 Desktop PCs', 'GPU Workstations'],
    operatingHours: { start: '08:00', end: '20:00' },
    isActive: true,
    requiresApproval: false,
    minBookingDuration: 30,
    maxBookingDuration: 180,
  },
  {
    name: 'Seminar Hall A',
    code: 'HALL-01',
    type: 'event_space',
    capacity: 200,
    location: 'Main Block, Ground Floor',
    building: 'Main Block',
    floor: 0,
    amenities: ['Projector', 'Microphone System', 'AC', 'Stage', 'Recording'],
    equipment: ['200 Chairs', 'Podium', 'Sound System', 'Video Recording'],
    operatingHours: { start: '08:00', end: '21:00' },
    isActive: true,
    requiresApproval: true,
    minBookingDuration: 60,
    maxBookingDuration: 480,
    bookingRules: {
      maxAdvanceBookingDays: 30,
      minNoticePeriodHours: 48,
      allowRecurring: false,
    },
  },
  {
    name: 'Seminar Hall B',
    code: 'HALL-02',
    type: 'event_space',
    capacity: 150,
    location: 'Main Block, First Floor',
    building: 'Main Block',
    floor: 1,
    amenities: ['Projector', 'Microphone System', 'AC'],
    equipment: ['150 Chairs', 'Podium', 'Sound System'],
    operatingHours: { start: '08:00', end: '21:00' },
    isActive: true,
    requiresApproval: true,
    minBookingDuration: 60,
    maxBookingDuration: 480,
  },
  {
    name: 'Meeting Room 101',
    code: 'MR-101',
    type: 'meeting_room',
    capacity: 12,
    location: 'Admin Block, First Floor',
    building: 'Admin Block',
    floor: 1,
    amenities: ['Projector', 'Whiteboard', 'Video Conferencing', 'AC'],
    equipment: ['Conference Table', 'TV Screen', 'Webcam'],
    operatingHours: { start: '08:00', end: '18:00' },
    isActive: true,
    requiresApproval: false,
    minBookingDuration: 30,
    maxBookingDuration: 120,
  },
  {
    name: 'Meeting Room 201',
    code: 'MR-201',
    type: 'meeting_room',
    capacity: 8,
    location: 'Admin Block, Second Floor',
    building: 'Admin Block',
    floor: 2,
    amenities: ['Whiteboard', 'AC'],
    equipment: ['Conference Table'],
    operatingHours: { start: '08:00', end: '18:00' },
    isActive: true,
    requiresApproval: false,
    minBookingDuration: 30,
    maxBookingDuration: 120,
  },
  {
    name: 'Conference Room A',
    code: 'CR-A',
    type: 'meeting_room',
    capacity: 20,
    location: 'Main Block, Second Floor',
    building: 'Main Block',
    floor: 2,
    amenities: ['Projector', 'Video Conferencing', 'Whiteboard', 'AC'],
    equipment: ['Large Conference Table', 'TV Screens', 'Webcam System'],
    operatingHours: { start: '08:00', end: '20:00' },
    isActive: true,
    requiresApproval: true,
    minBookingDuration: 30,
    maxBookingDuration: 240,
  },
  {
    name: 'Library Study Room 1',
    code: 'LIB-SR1',
    type: 'study_room',
    capacity: 6,
    location: 'Library Building, First Floor',
    building: 'Library',
    floor: 1,
    amenities: ['Whiteboard', 'AC', 'Power Outlets'],
    equipment: ['Study Table', 'Chairs'],
    operatingHours: { start: '08:00', end: '22:00' },
    isActive: true,
    requiresApproval: false,
    minBookingDuration: 30,
    maxBookingDuration: 180,
  },
  {
    name: 'Library Study Room 2',
    code: 'LIB-SR2',
    type: 'study_room',
    capacity: 4,
    location: 'Library Building, First Floor',
    building: 'Library',
    floor: 1,
    amenities: ['AC', 'Power Outlets'],
    equipment: ['Study Table', 'Chairs'],
    operatingHours: { start: '08:00', end: '22:00' },
    isActive: true,
    requiresApproval: false,
    minBookingDuration: 30,
    maxBookingDuration: 180,
  },
  {
    name: 'Sports Complex - Court A',
    code: 'SPORTS-A',
    type: 'sports_facility',
    capacity: 20,
    location: 'Sports Complex',
    building: 'Sports Complex',
    floor: 0,
    amenities: ['Changing Rooms', 'Water Cooler'],
    equipment: ['Basketball Hoops', 'Volleyball Net'],
    operatingHours: { start: '06:00', end: '21:00' },
    isActive: true,
    requiresApproval: false,
    minBookingDuration: 60,
    maxBookingDuration: 120,
  },
];

async function seed() {
  try {
    console.log('🌱 Starting database seed...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Resource.deleteMany({});
    await Booking.deleteMany({});
    console.log('   Done!\n');

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await User.create({
        email: userData.email,
        passwordHash: hashedPassword, // Schema requires passwordHash, not password
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        employeeId: userData.employeeId,
        isActive: true,
        isEmailVerified: true,
      });
      createdUsers.push(user);
      console.log(`   ✓ ${user.email} (${user.role})`);
    }
    console.log('');

    // Create resources
    console.log('🏢 Creating resources...');
    const createdResources = [];
    for (const resourceData of resources) {
      const resource = await Resource.create({
        code: resourceData.code,
        name: resourceData.name,
        type: resourceData.type === 'event_space' ? 'hall' : 
              resourceData.type === 'study_room' ? 'meeting_room' : resourceData.type,
        description: `${resourceData.name} - ${resourceData.location}`,
        location: resourceData.location,
        building: resourceData.building,
        floor: resourceData.floor,
        capacity: resourceData.capacity,
        attributes: {
          hasProjector: resourceData.amenities?.includes('Projector') || false,
          hasWhiteboard: resourceData.amenities?.includes('Whiteboard') || false,
          hasVideoConference: resourceData.amenities?.includes('Video Conferencing') || false,
          hasAC: resourceData.amenities?.includes('AC') || true,
          equipment: resourceData.equipment || [],
        },
        minBookingDurationMinutes: resourceData.minBookingDuration || 30,
        maxBookingDurationMinutes: resourceData.maxBookingDuration || 480,
        advanceBookingDays: resourceData.bookingRules?.maxAdvanceBookingDays || 30,
        requiresApproval: resourceData.requiresApproval,
        allowedRoles: ['student', 'faculty', 'admin'],
        isActive: resourceData.isActive,
      });
      createdResources.push(resource);
      console.log(`   ✓ ${resource.name} (${resource.code})`);
    }
    console.log('');

    // Create sample bookings
    console.log('📅 Creating sample bookings...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = [
      {
        resourceId: createdResources[0]._id, // Computer Lab A
        userId: createdUsers[2]._id, // Student
        title: 'Data Structures Lab Session',
        purpose: 'academic',
        startTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // Tomorrow 2 PM
        endTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // Tomorrow 4 PM
        status: 'approved',
        expectedAttendees: 25,
      },
      {
        resourceId: createdResources[2]._id, // Seminar Hall A
        userId: createdUsers[1]._id, // Faculty
        title: 'Department Seminar',
        purpose: 'event',
        description: 'Monthly department seminar with guest speaker',
        startTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // Day after tomorrow 10 AM
        endTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000), // Day after tomorrow 1 PM
        status: 'pending',
        expectedAttendees: 100,
      },
      {
        resourceId: createdResources[4]._id, // Meeting Room 101
        userId: createdUsers[2]._id, // Student
        title: 'Project Team Meeting',
        purpose: 'meeting',
        startTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 3 days later 3 PM
        endTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // 3 days later 4 PM
        status: 'approved',
        expectedAttendees: 5,
      },
    ];

    for (const bookingData of bookings) {
      const booking = await Booking.create(bookingData);
      console.log(`   ✓ ${booking.title} (${booking.status})`);
    }
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Database seeded successfully!\n');
    console.log('📋 Created:');
    console.log(`   • ${createdUsers.length} users`);
    console.log(`   • ${createdResources.length} resources`);
    console.log(`   • ${bookings.length} bookings\n`);
    console.log('🔐 Login Credentials:');
    console.log('   ┌─────────────────────────────────────────────────┐');
    console.log('   │ Email                    │ Password  │ Role    │');
    console.log('   ├─────────────────────────────────────────────────┤');
    console.log('   │ admin@campus.edu         │ Demo123!  │ admin   │');
    console.log('   │ faculty@campus.edu       │ Demo123!  │ faculty │');
    console.log('   │ student@campus.edu       │ Demo123!  │ student │');
    console.log('   │ student2@campus.edu      │ Demo123!  │ student │');
    console.log('   └─────────────────────────────────────────────────┘');
    console.log('═══════════════════════════════════════════════════════\n');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();
