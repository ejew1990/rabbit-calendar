export interface FamilyMember {
  id: string;
  name: string;
  color: string;      // Primary bg color like '#A0D8EF'
  textColor: string;  // Contrast text color
  borderColor: string;// Border color like '#76BBD9'
  avatar: string;     // Emoji avatar or cute character
  role: string;       // e.g., '爸爸', '妈妈', '小明'
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;       // YYYY-MM-DD (start date)
  time: string;       // HH:MM (24-hour style) or '全天'
  memberId: string;   // Member ID or 'all'
  category: 'life' | 'study' | 'work' | 'important' | 'birthday' | 'other';
  description?: string;
  reminderSent?: boolean;
  isAllDay?: boolean;  // Is it an all-day event?
  endDate?: string;    // YYYY-MM-DD (if multi-day)
  location?: string;   // Event location
}

export interface TodoTask {
  id: string;
  title: string;
  completed: boolean;
  createdBy: string;  // Member ID
  assignedTo: string; // Member ID or 'all'
  dueDate?: string;   // YYYY-MM-DD
  completedBy?: string; // Member ID who completed it
  createdAt: string;   // YYYY-MM-DD
}

export interface AlertNotification {
  id: string;
  time: string;       // Formatted time, e.g., '下午 3:00'
  title: string;
  message: string;
  memberId: string;   // Associated member ID or 'all'
  type: 'reminder' | 'task' | 'bunny' | 'event';
  timestamp: string;  // ISO string
}
