import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course, courses as localCourses } from '../data/courses';
import { db } from '../api/firebaseConfig';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

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
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      // Try to load from cache first
      const cachedCourses = await AsyncStorage.getItem('courses_cache');
      if (cachedCourses) {
        setCourses(JSON.parse(cachedCourses));
        setIsLoading(false); // Show cached content immediately
      }
    } catch (error) {
      console.error("Error loading cached courses:", error);
    }
    
    // Then fetch fresh data
    await fetchCourses();
  };

  const fetchCourses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "courses"));
      
      if (querySnapshot.empty) {
        // Seed database if empty
        console.log("Seeding database...");
        const seededCourses: Course[] = [];
        for (const course of localCourses) {
          await setDoc(doc(db, "courses", course.id), course);
          seededCourses.push(course);
        }
        setCourses(seededCourses);
        await AsyncStorage.setItem('courses_cache', JSON.stringify(seededCourses));
      } else {
        const fetchedCourses: Course[] = [];
        querySnapshot.forEach((doc) => {
          fetchedCourses.push(doc.data() as Course);
        });
        setCourses(fetchedCourses);
        await AsyncStorage.setItem('courses_cache', JSON.stringify(fetchedCourses));
      }
    } catch (error) {
      console.error("Error fetching courses: ", error);
      // Fallback to local data on error if cache is also empty
      if (courses.length === 0) {
        setCourses(localCourses);
      }
    } finally {
      setIsLoading(false);
    }
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
    <CoursesContext.Provider value={{ courses, likedCourses, toggleLike, isLiked, isLoading, refreshCourses: fetchCourses }}>
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
