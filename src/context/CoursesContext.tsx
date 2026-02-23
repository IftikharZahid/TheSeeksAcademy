/**
 * CoursesContext — Compatibility wrapper around Redux coursesSlice.
 * 
 * Preserves the `useCourses()` hook API so existing screens don't need changes.
 * The actual state lives in Redux now.
 */
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleLike as reduxToggleLike } from '../store/slices/coursesSlice';
import { Course } from '../data/courses';

interface CoursesContextType {
  courses: Course[];
  likedCourses: Set<string>;
  toggleLike: (id: string) => void;
  isLiked: (id: string) => boolean;
  isLoading: boolean;
  refreshCourses: () => Promise<void>;
}

export { Course } from '../data/courses';

export const useCourses = (): CoursesContextType => {
  const dispatch = useAppDispatch();
  const courses = useAppSelector((state) => state.courses.list);
  const likedIds = useAppSelector((state) => state.courses.likedIds);
  const isLoading = useAppSelector((state) => state.courses.isLoading);

  const likedCourses = new Set<string>(likedIds);

  const toggleLike = useCallback(
    (id: string) => dispatch(reduxToggleLike(id)),
    [dispatch]
  );

  const isLiked = useCallback(
    (id: string) => likedIds.includes(id),
    [likedIds]
  );

  const refreshCourses = useCallback(async () => {
    // Data is kept fresh by the onSnapshot listener in App.tsx
    await new Promise((r) => setTimeout(r, 300));
  }, []);

  return { courses, likedCourses, toggleLike, isLiked, isLoading, refreshCourses };
};
