import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../api/firebaseConfig';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

export interface Notice {
    id: string;
    title: string;
    message: string;
    timeAgo?: string;
    createdAt?: Timestamp;
    type: 'image' | 'initials' | 'icon';
    avatar?: string;
    initials?: string;
    initialsColor?: string;
    iconName?: string;
    iconColor?: string;
    iconBgColor?: string;
}

interface NotificationContextType {
    notices: Notice[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    isRead: (id: string) => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const formatTimeAgo = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Just now';

    const now = new Date();
    const date = timestamp.toDate();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";

    return "Just now";
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Load read IDs from storage on mount
    useEffect(() => {
        const loadReadStatus = async () => {
            try {
                const storedIds = await AsyncStorage.getItem('read_notices');
                if (storedIds) {
                    setReadIds(new Set(JSON.parse(storedIds)));
                }
            } catch (error) {
                console.error("Error loading read notices:", error);
            }
        };
        loadReadStatus();
    }, []);

    // Fetch notices from Firestore
    useEffect(() => {
        const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotices = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timeAgo: formatTimeAgo(doc.data().createdAt)
            })) as Notice[];

            setNotices(fetchedNotices);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notices:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const markAsRead = async (id: string) => {
        if (readIds.has(id)) return;

        const newReadIds = new Set(readIds);
        newReadIds.add(id);
        setReadIds(newReadIds);

        try {
            await AsyncStorage.setItem('read_notices', JSON.stringify(Array.from(newReadIds)));
        } catch (error) {
            console.error("Error saving read status:", error);
        }
    };

    const isRead = (id: string) => readIds.has(id);

    // Calculate unread count based on current notices and read IDs
    const unreadCount = notices.filter(n => !readIds.has(n.id)).length;

    return (
        <NotificationContext.Provider value={{
            notices,
            unreadCount,
            loading,
            markAsRead,
            isRead
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
