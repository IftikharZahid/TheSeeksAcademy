import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Course, courses } from '../data/courses';

interface CoursesContextType {
  courses: Course[];
  likedCourses: Set<string>;
  toggleLike: (id: string) => void;
  isLiked: (id: string) => boolean;
}

const CoursesContext = createContext<CoursesContextType | undefined>(undefined);

export const CoursesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [likedCourses, setLikedCourses] = useState<Set<string>>(new Set());

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
    <CoursesContext.Provider value={{ courses, likedCourses, toggleLike, isLiked }}>
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
