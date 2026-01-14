
export enum TransactionType {
  BARTER = 'BARTER',
  RENTAL = 'RENTAL',
  SALE = 'SALE'
}

export enum ItemStatus {
  AVAILABLE = 'AVAILABLE',
  PENDING = 'PENDING',
  TRADED = 'TRADED'
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
}

export interface Item {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  category: string;
  estimatedValue: number; // For barter fairness
  rentalPricePerDay?: number; // Optional if only for barter
  images: string[]; // Base64 or URLs
  wantedItems?: string; // What the owner wants in return
  status: ItemStatus;
  type: TransactionType[];
  createdAt?: string; // ISO date string for "posted X days ago"
  location?: string; // For distance display
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  trustScore: number; // 0-100
  itemsListed: number;
  reviews: Review[];
  phoneNumber?: string;
  address?: string;
  city?: string;
  bio?: string;
  joinedAt?: string; // ISO date string for "member since"
}

export interface Transaction {
  id: string;
  itemId: string;
  itemTitle: string;
  itemImage: string;
  lenderId: string;
  lenderName: string;
  borrowerId: string;
  borrowerName: string;
  requestDate: string; // When the request was made
  startDate?: string; // ISO Date String - when rental actually starts
  endDate?: string;   // ISO Date String - when rental should end
  status: 'REQUESTED' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'REJECTED';
  type: TransactionType;
  pricePerDay?: number; // Only for rentals
  requestedDays?: number; // How many days requested
}
