export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  university?: string;
  bio?: string;
  skills: string[];
  avatar: string;
  createdAt?: number;
}

export interface Bid {
  id: string;
  taskId: string;
  bidderId: string;
  bidderName: string;
  bidderAvatar?: string;
  amount: number; // Price
  timeEstimate: string; // e.g. "2 days"
  message: string;
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  posterId: string;
  posterName: string;
  assignedToId?: string;
  status: TaskStatus;
  budget: number;
  deadline: string; // Date string
  category: string;
  createdAt: number;
  bidsCount: number;
}

export interface PortfolioItem {
  taskId: string;
  title: string;
  description: string;
  completedAt: number;
  earned: number;
  feedback?: string;
  rating?: number;
  posterName?: string;
}