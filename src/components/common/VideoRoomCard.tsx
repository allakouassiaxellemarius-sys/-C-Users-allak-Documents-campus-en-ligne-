import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Course } from '@/types/index';

interface VideoRoomCardProps {
  course: Course;
  showDetails?: boolean;
}

export function VideoRoomCard({ course, showDetails = true }: VideoRoomCardProps) {
  const navigate = useNavigate();

  if (!course.video_room_enabled || !course.video_room_name) {
    return null;
  }

  return (
    <Card className="hover:shadow-md transition-all border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Video className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{course.name}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {course.professor || 'Enseignant'}
                </p>
              </div>
            </div>
            
            {showDetails && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{course.start_time.slice(0, 5)} - {course.end_time.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {course.type}
                  </Badge>
                  {course.room && (
                    <span className="text-[10px]">Salle: {course.room}</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <Button
            size="sm"
            onClick={() => navigate(`/videoconference?room=${course.video_room_name}`)}
            className="gap-2 shrink-0"
          >
            <Video className="h-3 w-3" />
            Rejoindre
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}