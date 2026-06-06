import { supabase } from './supabase';
import type { Course, Reminder, CourseType, CourseFile, Profile, Group, GroupMember, GroupMessage, Notification, Suggestion, TeacherMaterial, ExamTimer, UserGrade } from '@/types/index';

export const api = {
  courses: {
    async list(userId: string, knownRole?: string) {
      let role = knownRole;
      if (!role) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        role = profile?.role;
      }

      if (role === 'user') {
        // Étudiants : cours via inscriptions + cours qu'ils ont créés directement
        const [enrollRes, ownRes] = await Promise.all([
          supabase.from('enrollments').select('courses(*)').eq('student_id', userId),
          supabase.from('courses').select('*').eq('user_id', userId),
        ]);

        if (enrollRes.error) throw enrollRes.error;
        const enrolled = (enrollRes.data?.map((e: any) => e.courses).filter(Boolean) || []) as Course[];
        const ownCourses = (ownRes.data || []) as Course[];

        // Déduplication par id
        const seen = new Set<string>();
        return [...enrolled, ...ownCourses].filter(c => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
      } else {
        // Pour les professeurs et admins : leurs propres cours
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('user_id', userId)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;
        return (data || []) as Course[];
      }
    },

    async create(course: Omit<Course, 'id' | 'created_at'>) {
      const { data, error } = await supabase
        .from('courses')
        .insert([course])
        .select()
        .single();

      if (error) throw error;
      return data as Course;
    },

    async update(id: string, updates: Partial<Course>) {
      const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Course;
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    async listAll() {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return (data || []) as Course[];
    }
  },

  reminders: {
    async list(userId: string) {
      const { data, error } = await supabase
        .from('reminders')
        .select(`
          *,
          courses!inner(*)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    },

    async create(reminder: Omit<Reminder, 'id' | 'created_at'>) {
      const { data, error } = await supabase
        .from('reminders')
        .insert([reminder])
        .select()
        .single();

      if (error) throw error;
      return data as Reminder;
    },

    async update(id: string, updates: Partial<Reminder>) {
      const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Reminder;
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }
  },

  profiles: {
    async update(id: string, updates: Partial<Profile>) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },

    async search(query: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${query}%,username.ilike.%${query}%,profession.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      return (data || []) as Profile[];
    },

    async listAll(limit = 50) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as Profile[];
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Profile;
    },

    async get(id: string) {
      return this.getById(id);
    },

    async uploadAvatar(userId: string, file: File) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    }
  },

  files: {
    async list(userId: string) {
      const { data, error } = await supabase
        .from('course_files')
        .select('*, courses(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CourseFile[];
    },

    async upload(userId: string, file: File, courseId?: string) {
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('course_files')
        .insert([{
          user_id: userId,
          course_id: courseId,
          name: file.name,
          file_path: uploadData.path,
          file_type: file.type,
          file_size: file.size,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as CourseFile;
    },

    async download(filePath: string) {
      const { data, error } = await supabase.storage
        .from('course-files')
        .download(filePath);

      if (error) throw error;
      return data;
    },

    async delete(id: string, filePath: string) {
      const { error: storageError } = await supabase.storage
        .from('course-files')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error } = await supabase
        .from('course_files')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }
  },

  groups: {
    async list() {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(g => ({ ...g, members_count: g.group_members[0].count })) as Group[];
    },

    async create(group: Omit<Group, 'id' | 'created_at' | 'members_count'>) {
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert([group])
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: joinError } = await supabase
        .from('group_members')
        .insert([{
          group_id: newGroup.id,
          user_id: group.created_by
        }]);

      if (joinError) throw joinError;

      return newGroup as Group;
    },

    async join(groupId: string, userId: string) {
      const { error } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: userId
        }]);

      if (error) throw error;
    },

    async leave(groupId: string, userId: string) {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    },

    async update(id: string, updates: Partial<Group>) {
      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Group;
    },

    async joinByToken(token: string, userId: string) {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('join_token', token)
        .single();
      
      if (groupError || !group) throw new Error('Code de groupe invalide');
      
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: userId });
      
      if (joinError) {
        if (joinError.code === '23505') throw new Error('Vous êtes déjà membre de ce groupe');
        throw joinError;
      }
      
      return group as Group;
    },

    async getMembers(groupId: string) {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profiles(email, avatar_url)
        `)
        .eq('group_id', groupId);

      if (error) throw error;
      return (data || []) as GroupMember[];
    },

    async getMessages(groupId: string) {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          *,
          profiles(email, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as GroupMessage[];
    },

    async sendMessage(groupId: string, userId: string, content: string) {
      const { data, error } = await supabase
        .from('group_messages')
        .insert([{
          group_id: groupId,
          user_id: userId,
          content
        }])
        .select()
        .single();

      if (error) throw error;
      return data as GroupMessage;
    }
  },

  notifications: {
    async list(userId: string) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as Notification[];
    },

    async markAsRead(id: string) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    },

    async markAllAsRead(userId: string) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);

      if (error) throw error;
    },

    async create(notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single();

      if (error) throw error;
      return data as Notification;
    },

    async createBulk(notifications: Omit<Notification, 'id' | 'created_at'>[]) {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) throw error;
      return data;
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }
  },

  suggestions: {
    async list() {
      const { data, error } = await supabase
        .from('suggestions')
        .select(`
          *,
          profiles(email, username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(suggestion: Omit<Suggestion, 'id' | 'created_at' | 'status'>) {
      const { data, error } = await supabase
        .from('suggestions')
        .insert([suggestion])
        .select()
        .single();

      if (error) throw error;
      return data as Suggestion;
    },

    async updateStatus(id: string, status: Suggestion['status']) {
      const { data, error } = await supabase
        .from('suggestions')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Suggestion;
    }
  },

  materials: {
    async list() {
      const { data, error } = await supabase
        .from('teacher_materials')
        .select(`
          *,
          profiles:teacher_id(email, username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(material: Omit<TeacherMaterial, 'id' | 'created_at'>) {
      const { data, error } = await supabase
        .from('teacher_materials')
        .insert([material])
        .select()
        .single();

      if (error) throw error;
      return data as TeacherMaterial;
    },

    async update(id: string, updates: Partial<TeacherMaterial>) {
      const { data, error } = await supabase
        .from('teacher_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TeacherMaterial;
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('teacher_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }
  },

  submissions: {
    async listForMaterial(materialId: string) {
      const { data, error } = await supabase
        .from('material_submissions')
        .select(`
          *,
          profiles:student_id(email, username, avatar_url)
        `)
        .eq('material_id', materialId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },

    async listForStudent(studentId: string) {
      const { data, error } = await supabase
        .from('material_submissions')
        .select(`
          *,
          material:material_id(title, content_type)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(submission: any) {
      const { data, error } = await supabase
        .from('material_submissions')
        .insert([submission])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async grade(id: string, grade: string, feedback?: string) {
      const { data, error } = await supabase
        .from('material_submissions')
        .update({ grade, feedback })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async listAll() {
      const { data, error } = await supabase
        .from('material_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  },

  attendance: {
    async list(courseId: string, date: string) {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles:student_id(email, username, avatar_url)
        `)
        .eq('course_id', courseId)
        .eq('date', date);
      if (error) throw error;
      return data;
    },

    async mark(attendance: { course_id: string; student_id: string; date: string; status: string; notes?: string }) {
      const { data, error } = await supabase
        .from('attendance')
        .upsert(attendance, { onConflict: 'course_id,student_id,date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async getEnrolledStudents(courseId: string) {
      const { data, error } = await supabase.rpc('get_course_students', { p_course_id: courseId });
      if (error) throw error;
      return data;
    }
  },

  enrollments: {
    async enroll(courseId: string, studentId: string) {
      const { data, error } = await supabase
        .from('enrollments')
        .insert({ course_id: courseId, student_id: studentId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async unenroll(courseId: string, studentId: string) {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('course_id', courseId)
        .eq('student_id', studentId);
      if (error) throw error;
    },

    async listForStudent(studentId: string) {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', studentId);
      if (error) throw error;
      return data || [];
    },

    async listStudentsByCourse(courseId: string) {
      const { data, error } = await supabase
        .from('enrollments')
        .select('student_id, profiles!enrollments_student_id_fkey(id, username, email, avatar_url)')
        .eq('course_id', courseId);
      if (error) throw error;
      return data || [];
    },

    async listByTeacher(teacherId: string) {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses!inner(user_id), profiles!enrollments_student_id_fkey(id, username, email, avatar_url, role)')
        .eq('courses.user_id', teacherId);
      if (error) throw error;
      return data || [];
    }
  },
  grades: {
    async list(studentId: string) {
      const { data, error } = await supabase
        .from('user_grades')
        .select('*')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return (data || []) as UserGrade[];
    },

    async create(grade: Omit<UserGrade, 'id' | 'created_at'>) {
      const { data, error } = await supabase
        .from('user_grades')
        .insert([grade])
        .select()
        .single();

      if (error) throw error;
      return data as UserGrade;
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('user_grades')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }
  },

  payments: {
    async listOrders(userId: string) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },

    async adminListOrders() {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },

    async createCheckout(planId: string) {
      const { data, error } = await supabase.functions.invoke('create_stripe_checkout', {
        body: { plan_id: planId }
      });
      if (error) throw error;
      return data;
    },

    async verifyPayment(sessionId: string) {
      const { data, error } = await supabase.functions.invoke('verify_stripe_payment', {
        body: { sessionId }
      });
      if (error) throw error;
      return data;
    },

    async getWallet(userId: string) {
      const { data, error } = await supabase
        .from('admin_wallets')
        .select('*')
        .eq('owner_id', userId)
        .single();
      if (error) throw error;
      return data;
    },

    async listWithdrawalMethods() {
      const { data, error } = await supabase
        .from('withdrawal_methods')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },

    async createWithdrawalMethod(method: any) {
      const { data, error } = await supabase
        .from('withdrawal_methods')
        .insert(method)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async deleteWithdrawalMethod(id: string) {
      const { error } = await supabase
        .from('withdrawal_methods')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  timers: {
    async list() {
      const { data, error } = await supabase
        .from('exam_timers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },

    async create(timer: any) {
      const { data, error } = await supabase
        .from('exam_timers')
        .insert([timer])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: any) {
      const { data, error } = await supabase
        .from('exam_timers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('exam_timers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  admin: {
    async getStats() {
      const [courses, materials, groups, suggestions, users] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('teacher_materials').select('id', { count: 'exact', head: true }),
        supabase.from('groups').select('id', { count: 'exact', head: true }),
        supabase.from('suggestions').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      return {
        courses: courses.count || 0,
        materials: materials.count || 0,
        groups: groups.count || 0,
        suggestions: suggestions.count || 0,
        users: users.count || 0,
      };
    },

    async deleteUser(id: string) {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    async getSettings() {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');
      if (error) throw error;
      return (data || []).reduce((acc: any, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
    },

    async updateSetting(key: string, value: any) {
      const { data, error } = await supabase
        .from('site_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async getSystemLogs(limit: number = 50) {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*, actor:profiles(username, email)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },

    async getAllResources() {
      const [courses, materials] = await Promise.all([
        supabase.from('courses').select('*, teacher:profiles(username, email)'),
        supabase.from('teacher_materials').select('*, teacher:profiles(username, email)')
      ]);

      if (courses.error) throw courses.error;
      if (materials.error) throw materials.error;

      return {
        courses: courses.data || [],
        materials: materials.data || []
      };
    },

    async deleteCourse(id: string) {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    async deleteMaterial(id: string) {
      const { error } = await supabase
        .from('teacher_materials')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    async pushGlobalNotification(title: string, message: string, type: string = 'info') {
      const { data, error } = await supabase
        .rpc('push_global_notification', {
          p_title: title,
          p_message: message,
          p_type: type
        });
      if (error) throw error;
      return data;
    },

    async updateProfileAdmin(id: string, updates: Partial<Profile>) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    }
  },

  updates: {
    async list() {
      const { data, error } = await supabase
        .from('site_updates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async create(update: any) {
      const { data, error } = await supabase
        .from('site_updates')
        .insert([update])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // PWA Analytics
  pwaAnalytics: {
    // Récupérer les statistiques d'installation par plateforme
    async getInstallsByPlatform(days: number = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('pwa_install_events')
        .select('platform, created_at')
        .eq('event_type', 'install_completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },

    // Récupérer les statistiques d'installation par source
    async getInstallsBySource(days: number = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('pwa_install_events')
        .select('install_source, created_at')
        .eq('event_type', 'install_completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },

    // Récupérer le taux de conversion
    async getConversionRate(days: number = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: clicks } = await supabase
        .from('pwa_install_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'install_clicked')
        .gte('created_at', startDate.toISOString());

      const { data: installs } = await supabase
        .from('pwa_install_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'install_completed')
        .gte('created_at', startDate.toISOString());

      const clickCount = clicks?.length || 0;
      const installCount = installs?.length || 0;

      return {
        clicks: clickCount,
        installs: installCount,
        rate: clickCount > 0 ? (installCount / clickCount) * 100 : 0
      };
    },

    // Récupérer les parcours utilisateur
    async getUserJourneys(limit: number = 100) {
      const { data, error } = await supabase
        .from('pwa_user_journeys')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },

    // Récupérer les statistiques quotidiennes
    async getDailySummary(days: number = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('pwa_analytics_summary')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    },

    // Récupérer les statistiques globales
    async getGlobalStats() {
      const { data: totalInstalls } = await supabase
        .from('pwa_install_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'install_completed');

      const { data: totalClicks } = await supabase
        .from('pwa_install_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'install_clicked');

      const { data: totalViews } = await supabase
        .from('pwa_install_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'prompt_shown');

      const { data: avgTime } = await supabase
        .from('pwa_user_journeys')
        .select('time_to_install_seconds')
        .eq('install_completed', true);

      const avgTimeToInstall = avgTime && avgTime.length > 0
        ? avgTime.reduce((sum, j) => sum + (j.time_to_install_seconds || 0), 0) / avgTime.length
        : 0;

      return {
        totalInstalls: totalInstalls?.length || 0,
        totalClicks: totalClicks?.length || 0,
        totalViews: totalViews?.length || 0,
        avgTimeToInstall: Math.round(avgTimeToInstall),
        conversionRate: totalClicks && totalClicks.length > 0
          ? ((totalInstalls?.length || 0) / totalClicks.length) * 100
          : 0
      };
    },

    // Mettre à jour le résumé quotidien
    async updateDailySummary() {
      const { error } = await supabase.rpc('update_pwa_analytics_summary');
      if (error) throw error;
    }
  }

};