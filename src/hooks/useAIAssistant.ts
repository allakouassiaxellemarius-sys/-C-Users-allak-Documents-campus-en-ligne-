import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import type { Course, UserGrade } from '@/types/index';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StudentContext {
  courses: Course[];
  grades: UserGrade[];
  profile: { username?: string; email?: string; role?: string; university?: string } | null;
}

const QUESTIONS: { pattern: RegExp; answer: (ctx: StudentContext) => string }[] = [
  {
    pattern: /(bonjour|salut|coucu|hello|hey)/i,
    answer: (ctx) => `Bonjour${ctx.profile?.username ? ' ' + ctx.profile.username : ''} ! Je suis votre assistant Campus. Je peux vous aider avec vos cours, votre emploi du temps, vos notes, et plus encore. Comment puis-je vous aider ?`,
  },
  {
    pattern: /(merci|merci beaucoup|thanks)/i,
    answer: () => 'Avec plaisir ! N\'hésitez pas si vous avez d\'autres questions.',
  },
  {
    pattern: /(cours|emploi du temps|schedule|semaine|planning|horaire)/i,
    answer: (ctx) => {
      if (!ctx.courses.length) return 'Vous n\'avez pas encore de cours programmés. Pour ajouter des cours, allez dans l\'onglet "Mes Cours".';
      const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      const today = new Date().getDay();
      const todayIdx = today === 0 ? 6 : today - 1;
      const todayCourses = ctx.courses.filter(c => c.day_of_week === todayIdx);
      const sorted = [...ctx.courses].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
      let reply = `Vous avez **${ctx.courses.length} cours** cette semaine :\n\n`;
      if (todayCourses.length) {
        reply += `📌 **Aujourd'hui** (${days[todayIdx]}) : ${todayCourses.length} cours\n`;
        todayCourses.slice(0, 3).forEach(c => reply += `   • ${c.name} (${c.start_time.slice(0,5)}-${c.end_time.slice(0,5)})${c.room ? ` - ${c.room}` : ''}\n`);
        reply += '\n';
      }
      reply += '📋 **Cette semaine :**\n';
      sorted.slice(0, 8).forEach(c => reply += `   • ${days[c.day_of_week]} : ${c.name} — ${c.start_time.slice(0,5)}-${c.end_time.slice(0,5)}\n`);
      if (ctx.courses.length > 8) reply += `   ... et ${ctx.courses.length - 8} autres cours\n`;
      return reply;
    },
  },
  {
    pattern: /(note|notes|resultat|résultat|moyenne|exam|évaluation)/i,
    answer: (ctx) => {
      if (!ctx.grades.length) return 'Aucune note enregistrée pour le moment.';
      const total = ctx.grades.reduce((s, g) => s + (g.grade / g.max_grade) * g.coefficient, 0);
      const coefs = ctx.grades.reduce((s, g) => s + g.coefficient, 0);
      const avg = coefs > 0 ? (total / coefs * 20).toFixed(1) : 'N/A';
      let reply = `📊 **Votre moyenne : ${avg}/20** (sur ${ctx.grades.length} notes)\n\n`;
      const sorted = [...ctx.grades].sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
      sorted.slice(0, 5).forEach(g => {
        const pct = (g.grade / g.max_grade * 100).toFixed(0);
        reply += `   • ${g.course_name} : **${g.grade}/${g.max_grade}** (${pct}%)\n`;
      });
      if (ctx.grades.length > 5) reply += `   ... et ${ctx.grades.length - 5} autres notes`;
      return reply;
    },
  },
  {
    pattern: /(prof|enseignant|teacher|professeur)/i,
    answer: (ctx) => {
      const professors = [...new Set(ctx.courses.filter(c => c.professor).map(c => c.professor))];
      if (!professors.length) return 'Aucun professeur trouvé dans vos cours.';
      return `👨‍🏫 **Vos professeurs :**\n${professors.map(p => `   • ${p}`).join('\n')}`;
    },
  },
  {
    pattern: /(salle|room|classe|amphi)/i,
    answer: (ctx) => {
      const rooms = ctx.courses.filter(c => c.room).map(c => ({ name: c.name, room: c.room }));
      if (!rooms.length) return 'Aucune salle assignée à vos cours pour le moment.';
      return `📍 **Salles de cours :**\n${rooms.map(r => `   • ${r.name} → ${r.room}`).join('\n')}`;
    },
  },
  {
    pattern: /(aujourd'hui|ajd|today)/i,
    answer: (ctx) => {
      const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      const today = new Date().getDay();
      const todayIdx = today === 0 ? 6 : today - 1;
      const courses = ctx.courses.filter(c => c.day_of_week === todayIdx);
      if (!courses.length) return `Aucun cours aujourd'hui (${days[todayIdx]}). Profitez de votre journée !`;
      const sorted = courses.sort((a, b) => a.start_time.localeCompare(b.start_time));
      let reply = `📅 **Aujourd'hui (${days[todayIdx]}) — ${courses.length} cours :**\n\n`;
      sorted.forEach((c, i) => reply += `${i + 1}. **${c.name}** (${c.type}) — ${c.start_time.slice(0,5)}-${c.end_time.slice(0,5)}${c.room ? ` — ${c.room}` : ''}\n`);
      return reply;
    },
  },
  {
    pattern: /(profil|profile|compte|mon compte)/i,
    answer: (ctx) => {
      const p = ctx.profile;
      if (!p) return 'Je ne trouve pas votre profil.';
      return `👤 **Votre profil :**\n   • Identifiant : ${p.username || 'Non défini'}\n   • Email : ${p.email || 'Non renseigné'}\n   • Rôle : ${p.role || 'étudiant'}\n   • Université : ${p.university || 'Non renseignée'}`;
    },
  },
  {
    pattern: /(aide|help|que fais|que peux|commandes|possible)/i,
    answer: () => `🤖 **Commandes disponibles :**\n\n`
      + `   • *"mes cours"* — voir l'emploi du temps\n`
      + `   • *"aujourd'hui"* — les cours du jour\n`
      + `   • *"mes notes"* — consulter vos résultats\n`
      + `   • *"mes professeurs"* — liste des enseignants\n`
      + `   • *"mon profil"* — vos informations\n`
      + `   • *"salles"* — les salles de cours\n`
      + `   • *"aide"* — cette liste\n\n`
      + `Posez une question en langage naturel, je comprends !`,
  },
];

function generateLocalResponse(input: string, ctx: StudentContext): string {
  const normalized = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const q of QUESTIONS) {
    if (q.pattern.test(normalized)) return q.answer(ctx);
  }
  const fallbacks = [
    `Je n'ai pas compris votre demande. Essayez de reformuler, ou tapez **"aide"** pour voir ce que je peux faire.`,
    `Désolé, je n'ai pas de réponse à cette question. Vous pouvez essayer **"aide"** pour découvrir mes capacités.`,
    `Je ne peux répondre qu'à des questions sur vos cours, notes, professeurs et profil. Tapez **"aide"** pour en savoir plus.`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export function useAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: 'Bonjour ! Je suis votre assistant Campus en Ligne. Posez-moi des questions sur vos cours, notes, emploi du temps, etc.',
    timestamp: new Date(),
  }]);
  const [isTyping, setIsTyping] = useState(false);
  const contextRef = useRef<StudentContext>({ courses: [], grades: [], profile: null });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      let courses: Course[] = [];
      if (profile?.role === 'user') {
        const { data } = await supabase
          .from('enrollments')
          .select('courses(*)')
          .eq('student_id', userId);
        courses = (data?.map((e: any) => e.courses).filter(Boolean) || []) as Course[];
      } else {
        const { data } = await supabase
          .from('courses')
          .select('*')
          .eq('user_id', userId);
        courses = (data || []) as Course[];
      }

      const { data: grades } = await supabase
        .from('user_grades')
        .select('*')
        .eq('student_id', userId);

      contextRef.current = {
        courses,
        grades: (grades || []) as UserGrade[],
        profile: session?.user?.user_metadata ? {
          username: session.user.user_metadata.username as string,
          email: session.user.email,
          role: session.user.user_metadata.role as string,
          university: session.user.user_metadata.university as string,
        } : null,
      };
    })();
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

    const reply = generateLocalResponse(content, contextRef.current);
    const assistantMsg: Message = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setIsTyping(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant Campus en Ligne. Posez-moi des questions sur vos cours, notes, emploi du temps, etc.',
      timestamp: new Date(),
    }]);
  }, []);

  return { messages, isTyping, sendMessage, clearMessages };
}
