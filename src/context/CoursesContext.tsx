import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course, courses as localCourses } from '../data/courses';
import { db } from '../api/firebaseConfig';
import { collection, getDocs, setDoc, doc, onSnapshot } from 'firebase/firestore';

interface CoursesContextType {
  courses: Course[];
  likedCourses: Set<string>;
  toggleLike: (id: string) => void;
  isLiked: (id: string) => boolean;
  isLoading: boolean;
  refreshCourses: () => Promise<void>;
}

const CoursesContext = createContext<CoursesContextType | undefined>(undefined);

export const CoursesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [likedCourses, setLikedCourses] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    const initializeCourses = async () => {
      // Try to load from cache first
      try {
        const cachedCourses = await AsyncStorage.getItem('courses_cache');
        if (cachedCourses) {
          setCourses(JSON.parse(cachedCourses));
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading cached courses:", error);
      }

      // Set up real-time listener
      unsubscribe = onSnapshot(collection(db, "courses"), async (querySnapshot) => {
        try {
          if (querySnapshot.empty) {
             // Optional: Seed if absolutely needed, or just handle empty
             // For now, if empty, we might keep local fallback or just empty list
             if (courses.length === 0 && !await AsyncStorage.getItem('courses_cache')) {
                // Seed logic could go here if really desired

             }
             setCourses([]);
          } else {
             const fetchedCourses: Course[] = [];
             querySnapshot.forEach((doc) => {
               fetchedCourses.push({ id: doc.id, ...doc.data() } as Course);
             });
             setCourses(fetchedCourses);
             await AsyncStorage.setItem('courses_cache', JSON.stringify(fetchedCourses));
          }
          setIsLoading(false);
        } catch (error) {
           console.error("Error processing courses snapshot: ", error);
        }
      }, (error) => {
        console.error("Error listening to courses: ", error);
        setIsLoading(false);
      });
    };

    initializeCourses();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const refreshCourses = async () => {
     // No-op or maybe re-sync logic if needed, but onSnapshot handles updates.
     // We can keep it to satisfy interface or trigger a check.
     // For now, we'll just wait a bit to simulate refresh
     await new Promise(resolve => setTimeout(resolve, 500));
  };

  const toggleLike = (id: string) => {
    setLikedCourses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const isLiked = (id: string) => likedCourses.has(id);

  return (
    <CoursesContext.Provider value={{ courses, likedCourses, toggleLike, isLiked, isLoading, refreshCourses }}>
      {children}
    </CoursesContext.Provider>
  );
};

export const useCourses = () => {
  const context = useContext(CoursesContext);
  if (context === undefined) {
    throw new Error('useCourses must be used within a CoursesProvider');
  }
  return context;
};
