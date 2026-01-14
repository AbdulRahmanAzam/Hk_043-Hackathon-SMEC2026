
import { Item, ItemStatus, TransactionType, User, Transaction } from '../types';

// Helper to get dates relative to today
const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const daysFromNow = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000).toISOString();
const monthsAgo = (n: number) => new Date(today.getTime() - n * 30 * 24 * 60 * 60 * 1000).toISOString();

// ============================================
// USERS
// ============================================

export const MOCK_USERS: User[] = [
  {
    id: 'user_1',
    name: 'Ahmed Khan',
    email: 'ahmed@swapsync.pk',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    trustScore: 92,
    itemsListed: 4,
    reviews: [
      { id: 'r1', reviewerId: 'user_2', reviewerName: 'Fatima', rating: 5, comment: 'Camera was in excellent condition! Very reliable person.', date: '2025-10-15' },
      { id: 'r2', reviewerId: 'user_3', reviewerName: 'Bilal', rating: 4, comment: 'Good communication, would swap again.', date: '2025-09-20' },
      { id: 'r3', reviewerId: 'user_5', reviewerName: 'Sara', rating: 5, comment: 'Amazing experience! Item exactly as described.', date: '2025-11-10' }
    ],
    phoneNumber: '+92 321 456 7890',
    address: 'House 45, Street 12, F-10/2',
    city: 'Islamabad',
    bio: 'Photography enthusiast and weekend traveler. Love exploring northern areas. Happy to share my gear!',
    joinedAt: monthsAgo(24)
  },
  {
    id: 'user_2',
    name: 'Fatima Zahra',
    email: 'fatima@swapsync.pk',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    trustScore: 88,
    itemsListed: 3,
    reviews: [
      { id: 'r4', reviewerId: 'user_1', reviewerName: 'Ahmed', rating: 5, comment: 'Drone was perfect for my trip to Hunza!', date: '2025-11-01' },
      { id: 'r5', reviewerId: 'user_4', reviewerName: 'Hassan', rating: 4, comment: 'Great laptop, very fast. Smooth transaction.', date: '2025-10-25' }
    ],
    phoneNumber: '+92 333 789 1234',
    city: 'Lahore',
    bio: 'Tech lover and content creator. Believer in the sharing economy - why buy when you can swap?',
    joinedAt: monthsAgo(18)
  },
  {
    id: 'user_3',
    name: 'Bilal Mahmood',
    email: 'bilal@swapsync.pk',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    trustScore: 95,
    itemsListed: 5,
    reviews: [
      { id: 'r6', reviewerId: 'user_2', reviewerName: 'Fatima', rating: 5, comment: 'Best camping gear! Everything was clean and ready to use.', date: '2025-08-10' },
      { id: 'r7', reviewerId: 'user_1', reviewerName: 'Ahmed', rating: 5, comment: 'Power tools were top-notch! Made my DIY project so much easier.', date: '2025-09-05' },
      { id: 'r8', reviewerId: 'user_6', reviewerName: 'Ali', rating: 5, comment: 'Super reliable! Great gear, fast response.', date: '2025-11-20' }
    ],
    phoneNumber: '+92 300 123 4567',
    address: 'Apartment 7, Block C, Clifton',
    city: 'Karachi',
    bio: 'DIY expert and outdoor enthusiast. I have lots of tools and camping gear collecting dust - happy to share!',
    joinedAt: monthsAgo(36)
  },
  {
    id: 'user_4',
    name: 'Hassan Raza',
    email: 'hassan@swapsync.pk',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    trustScore: 85,
    itemsListed: 3,
    reviews: [
      { id: 'r9', reviewerId: 'user_3', reviewerName: 'Bilal', rating: 4, comment: 'Good keyboard, minor wear but works great.', date: '2025-10-01' }
    ],
    phoneNumber: '+92 345 678 9012',
    address: 'House 23, Gulberg III',
    city: 'Lahore',
    bio: 'Gamer and music producer. Got extra gear I barely use - let\'s swap!',
    joinedAt: monthsAgo(12)
  },
  {
    id: 'user_5',
    name: 'Sara Ahmed',
    email: 'sara@swapsync.pk',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    trustScore: 90,
    itemsListed: 4,
    reviews: [
      { id: 'r10', reviewerId: 'user_1', reviewerName: 'Ahmed', rating: 5, comment: 'Beautiful furniture! Made my living room look amazing.', date: '2025-11-15' },
      { id: 'r11', reviewerId: 'user_2', reviewerName: 'Fatima', rating: 5, comment: 'Love the designer bags! Sara is very professional.', date: '2025-10-20' }
    ],
    phoneNumber: '+92 311 234 5678',
    city: 'Islamabad',
    bio: 'Interior design enthusiast. I love swapping home decor and fashion items. Sustainability matters!',
    joinedAt: monthsAgo(15)
  },
  {
    id: 'user_6',
    name: 'Ali Hussain',
    email: 'ali@swapsync.pk',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    trustScore: 87,
    itemsListed: 3,
    reviews: [
      { id: 'r12', reviewerId: 'user_4', reviewerName: 'Hassan', rating: 4, comment: 'Good sports gear, well maintained.', date: '2025-09-30' }
    ],
    phoneNumber: '+92 322 987 6543',
    address: 'Flat 5, Phase 6, DHA',
    city: 'Karachi',
    bio: 'Sports fanatic and fitness enthusiast. Have extra gym equipment and sports gear to share!',
    joinedAt: monthsAgo(10)
  },
  {
    id: 'user_7',
    name: 'Ayesha Malik',
    email: 'ayesha@swapsync.pk',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    trustScore: 93,
    itemsListed: 5,
    reviews: [
      { id: 'r13', reviewerId: 'user_5', reviewerName: 'Sara', rating: 5, comment: 'Gorgeous party wear! Perfect for my cousin\'s wedding.', date: '2025-11-25' },
      { id: 'r14', reviewerId: 'user_2', reviewerName: 'Fatima', rating: 5, comment: 'Amazing book collection! Fast response and friendly.', date: '2025-10-10' }
    ],
    phoneNumber: '+92 336 111 2233',
    city: 'Rawalpindi',
    bio: 'Bookworm and fashion lover. Renting out party wear and books. Sharing is caring!',
    joinedAt: monthsAgo(20)
  },
  {
    id: 'user_8',
    name: 'Usman Sheikh',
    email: 'usman@swapsync.pk',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face',
    trustScore: 82,
    itemsListed: 2,
    reviews: [],
    phoneNumber: '+92 301 555 6677',
    address: 'House 89, Bahria Town',
    city: 'Lahore',
    bio: 'New to SwapSync! Looking to rent out my car accessories and tools.',
    joinedAt: monthsAgo(2)
  }
];

// ============================================
// ITEMS
// ============================================

export const MOCK_ITEMS: Item[] = [
  // === AHMED KHAN'S ITEMS (user_1) ===
  {
    id: 'item_1',
    ownerId: 'user_1',
    ownerName: 'Ahmed Khan',
    title: 'Sony Alpha a7 III Camera',
    description: 'Professional full-frame camera with 28-70mm lens. Perfect for weddings, events, or trips to northern areas. Barely used, excellent condition.',
    category: 'Electronics',
    estimatedValue: 450000,
    rentalPricePerDay: 5000,
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop'],
    wantedItems: 'DJI Drone, Gaming Console, Camping Gear',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.BARTER, TransactionType.RENTAL],
    createdAt: daysAgo(2),
    location: 'Islamabad'
  },
  {
    id: 'item_5',
    ownerId: 'user_1',
    ownerName: 'Ahmed Khan',
    title: 'PlayStation 5 Console',
    description: 'PS5 Disc Edition with 2 controllers and 5 games (FIFA 24, GTA V, God of War). Perfect for weekend gaming sessions!',
    category: 'Electronics',
    estimatedValue: 150000,
    rentalPricePerDay: 2500,
    images: ['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop'],
    wantedItems: 'Camera Lens, Drone, Laptop',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(3),
    location: 'Islamabad'
  },
  {
    id: 'item_17',
    ownerId: 'user_1',
    ownerName: 'Ahmed Khan',
    title: 'GoPro Hero 11 Black',
    description: 'Action camera perfect for adventure trips, vlogging, or underwater shots. Comes with waterproof case and mounts.',
    category: 'Electronics',
    estimatedValue: 85000,
    rentalPricePerDay: 1500,
    images: ['https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=400&h=300&fit=crop'],
    wantedItems: 'Tripod, Camera Bag, Microphone',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(8),
    location: 'Islamabad'
  },
  {
    id: 'item_18',
    ownerId: 'user_1',
    ownerName: 'Ahmed Khan',
    title: 'Canon 50mm f/1.8 Lens',
    description: 'The famous "nifty fifty" portrait lens. Amazing for portraits and low light photography. Like new condition.',
    category: 'Electronics',
    estimatedValue: 25000,
    rentalPricePerDay: 800,
    images: ['https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=400&h=300&fit=crop'],
    wantedItems: 'Wide angle lens, Flash, Photography books',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.BARTER, TransactionType.RENTAL],
    createdAt: daysAgo(12),
    location: 'Islamabad'
  },

  // === FATIMA ZAHRA'S ITEMS (user_2) ===
  {
    id: 'item_2',
    ownerId: 'user_2',
    ownerName: 'Fatima Zahra',
    title: 'DJI Mini 3 Pro Drone',
    description: 'Lightweight 4K drone with extra batteries and carrying case. Perfect for capturing aerial shots of Hunza, Skardu, or Swat.',
    category: 'Electronics',
    estimatedValue: 180000,
    rentalPricePerDay: 3000,
    images: ['https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop'],
    wantedItems: 'DSLR Camera, MacBook, iPhone',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.BARTER, TransactionType.RENTAL],
    createdAt: daysAgo(5),
    location: 'Lahore'
  },
  {
    id: 'item_6',
    ownerId: 'user_2',
    ownerName: 'Fatima Zahra',
    title: 'MacBook Pro M2 (14")',
    description: '2023 MacBook Pro with M2 chip, 16GB RAM, 512GB SSD. Perfect for video editing, design work, or development.',
    category: 'Electronics',
    estimatedValue: 450000,
    rentalPricePerDay: 4000,
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop'],
    wantedItems: 'Camera, Gaming Setup, Musical Instruments',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL],
    createdAt: daysAgo(1),
    location: 'Lahore'
  },
  {
    id: 'item_19',
    ownerId: 'user_2',
    ownerName: 'Fatima Zahra',
    title: 'Ring Light with Stand',
    description: '18-inch LED ring light with adjustable tripod stand. Perfect for YouTube videos, TikTok, or product photography.',
    category: 'Electronics',
    estimatedValue: 8000,
    rentalPricePerDay: 500,
    images: ['https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400&h=300&fit=crop'],
    wantedItems: 'Microphone, Webcam, Backdrop',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(4),
    location: 'Lahore'
  },

  // === BILAL MAHMOOD'S ITEMS (user_3) ===
  {
    id: 'item_3',
    ownerId: 'user_3',
    ownerName: 'Bilal Mahmood',
    title: 'Bosch Power Drill Set',
    description: 'Complete 18V cordless drill set with 50+ bits. Perfect for home renovation or DIY projects. Used only twice.',
    category: 'Tools',
    estimatedValue: 35000,
    rentalPricePerDay: 800,
    images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop'],
    wantedItems: 'Camping Gear, Board Games, Books',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(7),
    location: 'Karachi'
  },
  {
    id: 'item_4',
    ownerId: 'user_3',
    ownerName: 'Bilal Mahmood',
    title: '4-Person Camping Tent',
    description: 'Weatherproof dome tent, perfect for trips to Fairy Meadows, Naran, or Ratti Gali. Used once on a Hunza trip. Like new!',
    category: 'Outdoors',
    estimatedValue: 25000,
    rentalPricePerDay: 1500,
    images: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop'],
    wantedItems: 'Electronics, Photography Gear',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.BARTER, TransactionType.RENTAL],
    createdAt: daysAgo(14),
    location: 'Karachi'
  },
  {
    id: 'item_7',
    ownerId: 'user_3',
    ownerName: 'Bilal Mahmood',
    title: 'Portable Generator 3500W',
    description: 'Petrol generator perfect for camping trips or load shedding backup. Very reliable, low fuel consumption.',
    category: 'Tools',
    estimatedValue: 65000,
    rentalPricePerDay: 2000,
    images: ['https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=400&h=300&fit=crop'],
    wantedItems: 'Electronics, Outdoor Gear',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL],
    createdAt: daysAgo(10),
    location: 'Karachi'
  },
  {
    id: 'item_20',
    ownerId: 'user_3',
    ownerName: 'Bilal Mahmood',
    title: 'Sleeping Bags (2-Pack)',
    description: 'Two high-quality sleeping bags rated for -5°C. Perfect for northern trips. Compact and lightweight.',
    category: 'Outdoors',
    estimatedValue: 15000,
    rentalPricePerDay: 600,
    images: ['https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=400&h=300&fit=crop'],
    wantedItems: 'Backpack, Hiking boots, Flashlight',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(6),
    location: 'Karachi'
  },
  {
    id: 'item_21',
    ownerId: 'user_3',
    ownerName: 'Bilal Mahmood',
    title: 'Camping Stove & Cookware Set',
    description: 'Portable gas stove with pots, pans, and utensils. Everything you need for outdoor cooking.',
    category: 'Outdoors',
    estimatedValue: 12000,
    rentalPricePerDay: 500,
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop'],
    wantedItems: 'Cooler, Water filter, First aid kit',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(9),
    location: 'Karachi'
  },

  // === HASSAN RAZA'S ITEMS (user_4) ===
  {
    id: 'item_8',
    ownerId: 'user_4',
    ownerName: 'Hassan Raza',
    title: 'Mechanical Gaming Keyboard',
    description: 'RGB mechanical keyboard with Cherry MX switches. Perfect for gaming or coding. Barely used.',
    category: 'Electronics',
    estimatedValue: 18000,
    rentalPricePerDay: 400,
    images: ['https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=300&fit=crop'],
    wantedItems: 'Mouse, Headphones, Monitor',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.BARTER, TransactionType.RENTAL],
    createdAt: daysAgo(11),
    location: 'Lahore'
  },
  {
    id: 'item_9',
    ownerId: 'user_4',
    ownerName: 'Hassan Raza',
    title: 'Audio Interface - Focusrite Scarlett',
    description: '2-channel USB audio interface. Perfect for podcasting, music production, or streaming. Studio quality!',
    category: 'Electronics',
    estimatedValue: 35000,
    rentalPricePerDay: 800,
    images: ['https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=300&fit=crop'],
    wantedItems: 'Microphone, Headphones, MIDI keyboard',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(15),
    location: 'Lahore'
  },
  {
    id: 'item_22',
    ownerId: 'user_4',
    ownerName: 'Hassan Raza',
    title: 'Studio Headphones - Audio Technica',
    description: 'Professional ATH-M50x headphones. Excellent sound quality for mixing, gaming, or casual listening.',
    category: 'Electronics',
    estimatedValue: 22000,
    rentalPricePerDay: 500,
    images: ['https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=300&fit=crop'],
    wantedItems: 'Speakers, DAC, Cable',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(3),
    location: 'Lahore'
  },

  // === SARA AHMED'S ITEMS (user_5) ===
  {
    id: 'item_10',
    ownerId: 'user_5',
    ownerName: 'Sara Ahmed',
    title: 'Mid-Century Coffee Table',
    description: 'Beautiful walnut coffee table with brass legs. Perfect for living room styling or photoshoots.',
    category: 'Home',
    estimatedValue: 45000,
    rentalPricePerDay: 1000,
    images: ['https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=400&h=300&fit=crop'],
    wantedItems: 'Rugs, Lamps, Art',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(20),
    location: 'Islamabad'
  },
  {
    id: 'item_11',
    ownerId: 'user_5',
    ownerName: 'Sara Ahmed',
    title: 'Designer Handbag - Michael Kors',
    description: 'Authentic Michael Kors tote bag in excellent condition. Perfect for formal events or daily use.',
    category: 'Fashion',
    estimatedValue: 35000,
    rentalPricePerDay: 1200,
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=300&fit=crop'],
    wantedItems: 'Watches, Jewelry, Other bags',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL],
    createdAt: daysAgo(5),
    location: 'Islamabad'
  },
  {
    id: 'item_23',
    ownerId: 'user_5',
    ownerName: 'Sara Ahmed',
    title: 'Decorative Floor Lamp',
    description: 'Modern arc floor lamp with marble base. Creates beautiful ambient lighting for any room.',
    category: 'Home',
    estimatedValue: 28000,
    rentalPricePerDay: 700,
    images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop'],
    wantedItems: 'Plants, Cushions, Wall art',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(18),
    location: 'Islamabad'
  },
  {
    id: 'item_24',
    ownerId: 'user_5',
    ownerName: 'Sara Ahmed',
    title: 'Vintage Persian Rug',
    description: 'Handwoven 6x9 Persian rug with beautiful patterns. Perfect for living rooms or photoshoots.',
    category: 'Home',
    estimatedValue: 80000,
    rentalPricePerDay: 1500,
    images: ['https://images.unsplash.com/photo-1600166898405-da9535204843?w=400&h=300&fit=crop'],
    wantedItems: 'Antiques, Art pieces, Furniture',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL],
    createdAt: daysAgo(25),
    location: 'Islamabad'
  },

  // === ALI HUSSAIN'S ITEMS (user_6) ===
  {
    id: 'item_12',
    ownerId: 'user_6',
    ownerName: 'Ali Hussain',
    title: 'Cricket Kit - Complete Set',
    description: 'Full cricket kit including bat, pads, gloves, helmet, and bag. Perfect for weekend matches!',
    category: 'Outdoors',
    estimatedValue: 40000,
    rentalPricePerDay: 1000,
    images: ['https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=300&fit=crop'],
    wantedItems: 'Football gear, Gym equipment, Bicycle',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(8),
    location: 'Karachi'
  },
  {
    id: 'item_13',
    ownerId: 'user_6',
    ownerName: 'Ali Hussain',
    title: 'Adjustable Dumbbells Set',
    description: '24kg adjustable dumbbell pair. Perfect for home workouts. Space-saving design.',
    category: 'Outdoors',
    estimatedValue: 25000,
    rentalPricePerDay: 600,
    images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop'],
    wantedItems: 'Yoga mat, Resistance bands, Protein shaker',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(12),
    location: 'Karachi'
  },
  {
    id: 'item_25',
    ownerId: 'user_6',
    ownerName: 'Ali Hussain',
    title: 'Mountain Bike - Giant Talon',
    description: '27.5" hardtail mountain bike in excellent condition. Perfect for trails or city riding.',
    category: 'Outdoors',
    estimatedValue: 95000,
    rentalPricePerDay: 2000,
    images: ['https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&h=300&fit=crop'],
    wantedItems: 'Fitness tracker, Sports shoes, Backpack',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL],
    createdAt: daysAgo(4),
    location: 'Karachi'
  },

  // === AYESHA MALIK'S ITEMS (user_7) ===
  {
    id: 'item_14',
    ownerId: 'user_7',
    ownerName: 'Ayesha Malik',
    title: 'Bridal Jewelry Set',
    description: 'Stunning gold-plated kundan jewelry set. Includes necklace, earrings, and tikka. Perfect for weddings!',
    category: 'Fashion',
    estimatedValue: 30000,
    rentalPricePerDay: 3000,
    images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop'],
    wantedItems: 'Designer clothes, Watches, Bags',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL],
    createdAt: daysAgo(3),
    location: 'Rawalpindi'
  },
  {
    id: 'item_15',
    ownerId: 'user_7',
    ownerName: 'Ayesha Malik',
    title: 'Book Collection - 20 Bestsellers',
    description: 'Collection of 20 popular fiction books including Khaled Hosseini, Paulo Coelho, and Dan Brown.',
    category: 'Home',
    estimatedValue: 8000,
    rentalPricePerDay: 200,
    images: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop'],
    wantedItems: 'More books, Board games, Puzzles',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.BARTER, TransactionType.RENTAL],
    createdAt: daysAgo(30),
    location: 'Rawalpindi'
  },
  {
    id: 'item_26',
    ownerId: 'user_7',
    ownerName: 'Ayesha Malik',
    title: 'Formal Lehenga - Maroon',
    description: 'Beautiful embroidered maroon lehenga, size Medium. Worn once for a wedding. Dry cleaned.',
    category: 'Fashion',
    estimatedValue: 45000,
    rentalPricePerDay: 4000,
    images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&h=300&fit=crop'],
    wantedItems: 'Other formal wear, Jewelry, Clutches',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL],
    createdAt: daysAgo(7),
    location: 'Rawalpindi'
  },
  {
    id: 'item_27',
    ownerId: 'user_7',
    ownerName: 'Ayesha Malik',
    title: 'Party Clutch Collection',
    description: 'Set of 3 designer clutches in gold, silver, and rose gold. Perfect for parties and events.',
    category: 'Fashion',
    estimatedValue: 12000,
    rentalPricePerDay: 800,
    images: ['https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400&h=300&fit=crop'],
    wantedItems: 'Earrings, Heels, Scarves',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(10),
    location: 'Rawalpindi'
  },
  {
    id: 'item_28',
    ownerId: 'user_7',
    ownerName: 'Ayesha Malik',
    title: 'Pakistani Literature Set',
    description: '15 Urdu literature books including Bano Qudsia, Ashfaq Ahmed, and Qurratulain Hyder classics.',
    category: 'Home',
    estimatedValue: 6000,
    rentalPricePerDay: 150,
    images: ['https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&h=300&fit=crop'],
    wantedItems: 'English novels, Self-help books, Poetry',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.BARTER, TransactionType.RENTAL],
    createdAt: daysAgo(35),
    location: 'Rawalpindi'
  },

  // === USMAN SHEIKH'S ITEMS (user_8) ===
  {
    id: 'item_16',
    ownerId: 'user_8',
    ownerName: 'Usman Sheikh',
    title: 'Car Roof Rack - Universal',
    description: 'Universal car roof rack, fits most sedans and SUVs. Perfect for road trips with extra luggage.',
    category: 'Tools',
    estimatedValue: 20000,
    rentalPricePerDay: 700,
    images: ['https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop'],
    wantedItems: 'Car accessories, Tools, Camping gear',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL, TransactionType.BARTER],
    createdAt: daysAgo(6),
    location: 'Lahore'
  },
  {
    id: 'item_29',
    ownerId: 'user_8',
    ownerName: 'Usman Sheikh',
    title: 'Pressure Washer',
    description: 'High-pressure washer 1800 PSI. Perfect for car cleaning or house washing. Easy to use.',
    category: 'Tools',
    estimatedValue: 28000,
    rentalPricePerDay: 900,
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
    wantedItems: 'Garden tools, Car polish kit, Vacuum cleaner',
    status: ItemStatus.AVAILABLE,
    type: [TransactionType.RENTAL],
    createdAt: daysAgo(2),
    location: 'Lahore'
  }
];

// ============================================
// TRANSACTIONS
// ============================================

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_1',
    itemId: 'item_3',
    itemTitle: 'Bosch Power Drill Set',
    itemImage: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop',
    lenderId: 'user_3',
    lenderName: 'Bilal Mahmood',
    borrowerId: 'user_1',
    borrowerName: 'Ahmed Khan',
    requestDate: daysAgo(5),
    startDate: daysAgo(3),
    endDate: daysFromNow(4),
    status: 'ACTIVE',
    type: TransactionType.RENTAL,
    pricePerDay: 800,
    requestedDays: 7
  },
  {
    id: 'tx_2',
    itemId: 'item_2',
    itemTitle: 'DJI Mini 3 Pro Drone',
    itemImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop',
    lenderId: 'user_2',
    lenderName: 'Fatima Zahra',
    borrowerId: 'user_1',
    borrowerName: 'Ahmed Khan',
    requestDate: daysAgo(12),
    startDate: daysAgo(10),
    endDate: daysAgo(2),
    status: 'ACTIVE',
    type: TransactionType.BARTER,
    pricePerDay: 0,
    requestedDays: 8
  },
  {
    id: 'tx_3',
    itemId: 'item_14',
    itemTitle: 'Bridal Jewelry Set',
    itemImage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop',
    lenderId: 'user_7',
    lenderName: 'Ayesha Malik',
    borrowerId: 'user_5',
    borrowerName: 'Sara Ahmed',
    requestDate: daysAgo(2),
    status: 'REQUESTED',
    type: TransactionType.RENTAL,
    pricePerDay: 3000,
    requestedDays: 3
  },
  {
    id: 'tx_4',
    itemId: 'item_25',
    itemTitle: 'Mountain Bike - Giant Talon',
    itemImage: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&h=300&fit=crop',
    lenderId: 'user_6',
    lenderName: 'Ali Hussain',
    borrowerId: 'user_4',
    borrowerName: 'Hassan Raza',
    requestDate: daysAgo(1),
    status: 'REQUESTED',
    type: TransactionType.RENTAL,
    pricePerDay: 2000,
    requestedDays: 5
  }
];
