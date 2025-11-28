export type User = {
id: number;
name: string;
email: string;
role: 'student' | 'teacher' | 'admin';
};


export type Course = {
id: number;
name: string;
teacher: string;
cover?: string;
};