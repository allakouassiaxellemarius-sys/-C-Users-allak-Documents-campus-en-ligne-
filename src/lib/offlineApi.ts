// Wrapper pour les appels API avec support du mode hors ligne

import { isOnline, queueOperation } from './syncManager';
import {
  saveToStore,
  getAllFromStore,
  getFromStore,
  getByIndex,
  STORES,
  cacheData,
  getCachedData
} from './offlineStorage';
import type { Course } from '@/types/index';

// Fonction générique pour les requêtes GET avec cache
export async function offlineAwareGet<T>(
  url: string,
  cacheKey: string,
  fetchFn: () => Promise<T>,
  storeName?: string
): Promise<T> {
  try {
    // Si en ligne, récupérer depuis le serveur
    if (isOnline()) {
      const data = await fetchFn();
      
      // Mettre en cache pour une utilisation hors ligne
      if (storeName) {
        await saveToStore(storeName, data);
      } else {
        await cacheData(cacheKey, data);
      }
      
      return data;
    }
    
    // Si hors ligne, récupérer depuis le cache
    console.log('Mode hors ligne: récupération depuis le cache');
    
    if (storeName) {
      const cachedData = await getAllFromStore<T>(storeName);
      return cachedData as T;
    } else {
      const cachedData = await getCachedData<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    throw new Error('Aucune donnée en cache disponible');
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    
    // Tenter de récupérer depuis le cache en cas d'erreur
    if (storeName) {
      const cachedData = await getAllFromStore<T>(storeName);
      if (cachedData && (Array.isArray(cachedData) ? cachedData.length > 0 : true)) {
        console.log('Utilisation des données en cache après erreur');
        return cachedData as T;
      }
    } else {
      const cachedData = await getCachedData<T>(cacheKey);
      if (cachedData) {
        console.log('Utilisation des données en cache après erreur');
        return cachedData;
      }
    }
    
    throw error;
  }
}

// Fonction pour les requêtes POST/PUT/DELETE avec file d'attente
export async function offlineAwareWrite(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  headers: Record<string, string>,
  body?: any,
  executeFn?: () => Promise<any>
): Promise<any> {
  try {
    // Si en ligne, exécuter immédiatement
    if (isOnline() && executeFn) {
      return await executeFn();
    }
    
    // Si hors ligne, ajouter à la file d'attente
    console.log('Mode hors ligne: ajout à la file d\'attente');
    await queueOperation(url, method, headers, body);
    
    return {
      success: true,
      queued: true,
      message: 'Opération mise en file d\'attente pour synchronisation ultérieure'
    };
  } catch (error) {
    console.error('Erreur lors de l\'opération:', error);
    
    // En cas d'erreur réseau, ajouter à la file d'attente
    if (!isOnline()) {
      await queueOperation(url, method, headers, body);
      return {
        success: true,
        queued: true,
        message: 'Opération mise en file d\'attente pour synchronisation ultérieure'
      };
    }
    
    throw error;
  }
}

// Fonctions spécifiques pour les cours
export async function getCourses(userId: string, fetchFn: () => Promise<Course[]>): Promise<Course[]> {
  return offlineAwareGet<Course[]>(
    `/courses?user_id=${userId}`,
    `courses_${userId}`,
    fetchFn,
    STORES.COURSES
  );
}

export async function getEnrolledCourses(studentId: string, fetchFn: () => Promise<Course[]>): Promise<Course[]> {
  try {
    if (isOnline()) {
      const data = await fetchFn();
      await saveToStore(STORES.COURSES, data);
      return data;
    }
    
    // Récupérer les inscriptions de l'étudiant
    const enrollments = await getByIndex<any>(STORES.ENROLLMENTS, 'student_id', studentId);
    const courseIds = enrollments.map(e => e.course_id);
    
    // Récupérer les cours correspondants
    const allCourses = await getAllFromStore<Course>(STORES.COURSES);
    return allCourses.filter(c => courseIds.includes(c.id));
  } catch (error) {
    console.error('Erreur lors de la récupération des cours inscrits:', error);
    throw error;
  }
}

export async function saveCourse(course: Course, executeFn: () => Promise<any>): Promise<any> {
  const result = await offlineAwareWrite(
    '/courses',
    'POST',
    { 'Content-Type': 'application/json' },
    course,
    executeFn
  );
  
  // Si en mode hors ligne, sauvegarder localement
  if (result.queued) {
    await saveToStore(STORES.COURSES, { ...course, id: `temp_${Date.now()}`, _pending: true });
  }
  
  return result;
}

export async function updateCourse(course: Course, executeFn: () => Promise<any>): Promise<any> {
  const result = await offlineAwareWrite(
    `/courses/${course.id}`,
    'PUT',
    { 'Content-Type': 'application/json' },
    course,
    executeFn
  );
  
  // Si en mode hors ligne, mettre à jour localement
  if (result.queued) {
    await saveToStore(STORES.COURSES, { ...course, _pending: true });
  }
  
  return result;
}

export async function deleteCourse(courseId: string, executeFn: () => Promise<any>): Promise<any> {
  return offlineAwareWrite(
    `/courses/${courseId}`,
    'DELETE',
    { 'Content-Type': 'application/json' },
    undefined,
    executeFn
  );
}

// Fonctions pour les rappels
export async function getReminders(userId: string, fetchFn: () => Promise<any[]>): Promise<any[]> {
  return offlineAwareGet<any[]>(
    `/reminders?user_id=${userId}`,
    `reminders_${userId}`,
    fetchFn,
    STORES.REMINDERS
  );
}

// Fonctions pour les groupes
export async function getGroups(fetchFn: () => Promise<any[]>): Promise<any[]> {
  return offlineAwareGet<any[]>(
    '/groups',
    'groups',
    fetchFn,
    STORES.GROUPS
  );
}

// Fonctions pour les notifications
export async function getNotifications(userId: string, fetchFn: () => Promise<any[]>): Promise<any[]> {
  return offlineAwareGet<any[]>(
    `/notifications?user_id=${userId}`,
    `notifications_${userId}`,
    fetchFn,
    STORES.NOTIFICATIONS
  );
}

// Vérifier si une donnée est en attente de synchronisation
export function isPending(item: any): boolean {
  return item._pending === true;
}

// Marquer une donnée comme synchronisée
export async function markAsSynced(storeName: string, item: any): Promise<void> {
  if (item._pending) {
    delete item._pending;
    await saveToStore(storeName, item);
  }
}