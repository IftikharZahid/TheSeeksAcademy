import axios from 'axios';


export const api = axios.create({
baseURL: 'https://api.theseeksacademy.example', // replace
timeout: 10000,
});


export const AuthAPI = {
login: (email: string, password: string) => api.post('/auth/login', { email, password }),
signup: (payload: any) => api.post('/auth/signup', payload),
};


export const CoursesAPI = {
list: () => api.get('/courses'),
};


export const AttendanceAPI = {
monthlyReport: (studentId: number) => api.get(`/students/${studentId}/attendance`),
};