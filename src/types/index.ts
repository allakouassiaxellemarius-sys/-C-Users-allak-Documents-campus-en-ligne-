import React from 'react';

export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export type UserRole = 'user' | 'admin' | 'teacher';

export interface Suggestion {
  id: string;
  user_id: string;
  content: string;
  status: 'pending' | 'reviewed' | 'implemented';
  created_at: string;
}

export interface TeacherMaterial {
  id: string;
  teacher_id: string;
  course_id?: string;
  title: string;
  description?: string;
  content_type: 'course' | 'quiz' | 'assignment';
  data: any;
  created_at: string;
}

export interface NotificationSettings {
  browser_notifications: boolean;
  in_app_notifications: boolean;
  email_notifications: boolean;
}

export interface Profile {
  id: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  role: UserRole;
  profession?: string;
  bio?: string;
  university?: string;
  phone?: string;
  is_premium: boolean;
  auto_update: boolean;
  created_at: string;
  notification_settings?: NotificationSettings;
  department?: string;
  specialization?: string;
  office_location?: string;
  office_hours?: string;
  academic_title?: string;
  location_lat?: number;
  location_lng?: number;
  permissions_granted?: {
    location?: boolean;
    notifications?: boolean;
    files?: boolean;
  };
}

export type CourseType = 'CM' | 'TD' | 'TP';

export interface Course {
  id: string;
  user_id: string;
  name: string;
  professor?: string;
  room?: string;
  day_of_week: number; // 0 (Mon) to 6 (Sun)
  start_time: string; // "HH:mm:ss"
  end_time: string; // "HH:mm:ss"
  type: CourseType;
  color?: string;
  video_room_name?: string;
  video_room_enabled?: boolean;
  created_at: string;
}

export interface Reminder {
  id: string;
  course_id: string;
  user_id: string;
  minutes_before: number;
  is_enabled: boolean;
  created_at: string;
}

export interface CourseFile {
  id: string;
  user_id: string;
  course_id?: string;
  name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
  courses?: { name: string };
}

export type GroupType = 'study' | 'td';

export interface Group {
  id: string;
  name: string;
  description?: string;
  type: GroupType;
  created_by: string;
  max_members?: number;
  is_private: boolean;
  join_token?: string;
  created_at: string;
  members_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profiles?: { email: string; avatar_url?: string };
}

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { email: string; avatar_url?: string };
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type?: string;
  is_read: boolean;
  created_at: string;
}

export interface ExamTimer {
  id: string;
  title: string;
  duration: number;
  remaining_seconds: number;
  started_at: string | null;
  is_running: boolean;
  teacher_id: string;
  course_id?: string;
  created_at: string;
}


export interface UserGrade {
  id: string;
  student_id: string;
  course_name: string;
  grade: number;
  max_grade: number;
  coefficient: number;
  exam_date: string;
  semester?: string;
  academic_year?: string;
  created_at: string;
}