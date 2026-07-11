import { Timestamp } from 'firebase/firestore';

export interface PushNotification {
    id: string; // Document ID mapped to notificationId
    notificationId?: string;
    title: string;
    message: string; // The full description
    imageUrl?: string;
    pdfUrl?: string; // Sometimes attachments are PDFs
    priority: 'Normal' | 'Important' | 'Urgent';
    targetRole: 'Students' | 'Teachers' | 'Both';
    audience?: 'Students' | 'Teachers' | 'Both';
    instituteId?: string;
    classId?: string;
    sectionId?: string;
    createdAt: any; // Firestore Timestamp
    expiresAt?: any; // Firestore Timestamp
    createdBy?: string;
    isActive?: boolean;
    published?: boolean;
    type?: string;
}

export interface PushNotificationState {
    list: PushNotification[];
    readIds: string[];
    loading: boolean;
    error: string | null;
}
