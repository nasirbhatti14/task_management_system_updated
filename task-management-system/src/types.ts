export interface User {
  id: string;
  username: string;
}

export interface Task {
  id: string;
  owner: string;
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  due_date: string;
  created_at: string;
  sharedWith: string[];
  attachments?: { name: string; type: string; data: string }[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AnalyticsOverview {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
}

export interface AnalyticsTrend {
  date: string;
  completed: number;
  pending: number;
}
