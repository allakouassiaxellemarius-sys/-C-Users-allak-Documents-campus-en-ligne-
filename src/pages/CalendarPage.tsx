import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Course } from '@/types/index';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  getDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon,
  AlertCircle,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (user) {
      loadCourses();

      const channel = supabase
        .channel('calendar-courses')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'courses',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadCourses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const data = await api.courses.list(user!.id);
      setCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDayCourses = (date: Date) => {
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    // Our day_of_week is 0 for Monday, 6 for Sunday.
    let dayIdx = getDay(date);
    dayIdx = dayIdx === 0 ? 6 : dayIdx - 1;
    return courses.filter(c => c.day_of_week === dayIdx);
  };

  const dayHasCourses = (date: Date) => {
    return getDayCourses(date).length > 0;
  };

  const selectedCourses = selectedDate ? getDayCourses(selectedDate) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        <Card className="shadow-lg border-primary/5">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-extrabold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </CardTitle>
              <CardDescription className="text-sm">Vue d'ensemble de votre mois.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="touch-target">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="touch-target">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={fr}
              className="w-full flex justify-center scale-100 sm:scale-110 lg:scale-125 my-4 sm:my-8 origin-center"
              modifiers={{
                hasEvent: (date) => dayHasCourses(date),
              }}
              modifiersClassNames={{
                hasEvent: "bg-primary/20 font-bold text-primary rounded-full ring-2 ring-primary/30 ring-offset-2",
              }}
            />
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-none shadow-none p-4 md:p-6">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-primary/10 rounded-xl">
               <CalendarIcon className="h-6 w-6 text-primary" />
             </div>
             <div>
                <h3 className="font-bold text-lg">Conseil Organisation</h3>
                <p className="text-sm text-muted-foreground">
                  Utilisez la vue mensuelle pour planifier vos périodes de révision en fonction de vos cours réguliers.
                </p>
             </div>
          </div>
        </Card>
      </div>

      <div className="md:col-span-1 space-y-6">
        <Card className="h-full shadow-md border-primary/10">
          <CardHeader className="bg-primary/5 py-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {selectedDate ? format(selectedDate, 'EEEE d MMMM', { locale: fr }) : 'Sélectionnez un jour'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-4">
                {selectedCourses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                    <AlertCircle className="h-10 w-10 mb-3" />
                    <p className="text-sm font-medium">Aucun cours prévu</p>
                  </div>
                ) : (
                  selectedCourses.map((course) => (
                    <Card key={course.id} className="border-l-4 shadow-sm" style={{ borderLeftColor: course.color }}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm leading-tight">{course.name}</h4>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">{course.type}</Badge>
                        </div>
                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>{course.start_time.slice(0, 5)} - {course.end_time.slice(0, 5)}</span>
                          </div>
                          {course.room && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>Salle: {course.room}</span>
                            </div>
                          )}
                        </div>
                        {course.video_room_enabled && course.video_room_name && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/videoconference?room=${course.video_room_name}`)}
                            className="w-full mt-3 gap-2 text-xs h-7"
                          >
                            <Video className="h-3 w-3" />
                            Rejoindre
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}