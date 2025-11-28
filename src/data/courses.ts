export interface Course {
  id: string;
  name: string;
  teacher: string;
  image: string;
}

export const courses: Course[] = [
  {
    id: '1',
    name: 'Introduction to Computer Science',
    teacher: 'Dr. David Malan',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '2',
    name: 'Full Stack Web Development',
    teacher: 'Angela Yu',
    image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '3',
    name: 'Data Structures & Algorithms',
    teacher: 'Abdul Bari',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '4',
    name: 'Python for Data Science',
    teacher: 'Jose Portilla',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '5',
    name: 'Machine Learning A-Z',
    teacher: 'Andrew Ng',
    image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '6',
    name: 'React Native Mobile Dev',
    teacher: 'Maximilian Schwarzmüller',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '7',
    name: 'Cybersecurity Fundamentals',
    teacher: 'Nathan House',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '8',
    name: 'Cloud Computing (AWS)',
    teacher: 'Stephane Maarek',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '9',
    name: 'Database Management (SQL)',
    teacher: 'Mosh Hamedani',
    image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '10',
    name: 'UI/UX Design Masterclass',
    teacher: 'Gary Simon',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
];
