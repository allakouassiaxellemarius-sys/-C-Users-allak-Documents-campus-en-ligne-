import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

export function useReminders() {
  const { user, profile } = useAuth();
  const checkedReminders = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      try {
        const settings = profile?.notification_settings || {
          browser_notifications: true,
          in_app_notifications: true,
          email_notifications: false
        };

        const reminders = await api.reminders.list(user.id);
        const activeReminders = reminders.filter(r => r.is_enabled);
        
        const now = new Date();
        const currentDayIdx = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        activeReminders.forEach(async (reminder) => {
          const course = reminder.courses;
          if (course.day_of_week !== currentDayIdx) return;

          // Parse start_time "HH:mm:ss"
          const [hours, minutes] = course.start_time.split(':').map(Number);
          const courseStartMinutes = hours * 60 + minutes;
          
          const diff = courseStartMinutes - currentTimeInMinutes;
          
          // Check if we are in the notification window (1-minute tolerance)
          if (diff >= reminder.minutes_before - 1 && diff <= reminder.minutes_before) {
            const reminderKey = `${reminder.id}-${now.toLocaleDateString()}-${now.getHours()}-${now.getMinutes()}`;
            
            if (!checkedReminders.current.has(reminderKey)) {
              // Trigger notification
              const title = 'Rappel de Cours';
              const message = `Le cours "${course.name}" commence dans ${diff} minutes à ${course.start_time.slice(0, 5)}!`;
              
              // In-app notification
              if (settings.in_app_notifications) {
                api.notifications.create({
                  user_id: user.id,
                  title,
                  message,
                  type: 'info'
                }).catch(err => console.error('Failed to create in-app notification:', err));
              }

              // Email notification (Unlimited through Edge Function)
              if (settings.email_notifications && user.email) {
                supabase.functions.invoke('send-email', {
                  body: {
                    to: user.email,
                    subject: `Rappel: ${course.name} commence bientôt!`,
                    body: message,
                    html: `
                      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h2 style="color: #3b82f6;">Rappel de Cours</h2>
                        <p style="font-size: 16px;">${message}</p>
                        <hr style="border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #64748b;">Envoyé par mon espace étudiant. Vous pouvez désactiver ces notifications dans votre profil.</p>
                      </div>
                    `
                  }
                }).catch((err: any) => console.error('Failed to send email notification:', err));
              }

              if (settings.browser_notifications && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  new Notification(title, { body: message });
                } else if (Notification.permission === 'default') {
                  Notification.requestPermission();
                }
              }
              
              toast.info(message, { 
                duration: 10000,
                icon: '🔔'
              });

              checkedReminders.current.add(reminderKey);
            }
          }
        });
      } catch (error) {
        console.error('Error checking reminders:', error);
      }
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    checkReminders(); // Check immediately on mount

    return () => clearInterval(interval);
  }, [user, profile]);
}