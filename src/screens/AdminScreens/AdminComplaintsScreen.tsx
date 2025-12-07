import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../api/firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface Complaint {
  id: string;
  subject: string;
  category: string;
  description: string;
  userEmail: string;
  userName?: string;
  status: 'Pending' | 'Resolved';
  createdAt: any;
}

export const AdminComplaintsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const complaintsData: Complaint[] = [];
      snapshot.forEach((doc) => {
        complaintsData.push({ id: doc.id, ...doc.data() } as Complaint);
      });
      setComplaints(complaintsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMarkResolved = async (id: string, currentStatus: string) => {
    if (currentStatus === 'Resolved') return;

    try {
      await updateDoc(doc(db, 'complaints', id), {
        status: 'Resolved'
      });
      Alert.alert('Success', 'Complaint marked as resolved');
    } catch (error) {
      console.error("Error updating document: ", error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const renderItem = ({ item }: { item: Complaint }) => {
    const date = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
    
    return (
      <View style={[styles.card, { backgroundColor: isDark ? theme.card : '#ffffff', borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.category, { color: theme.primary }]}>{item.category}</Text>
            <Text style={[styles.date, { color: theme.placeholder }]}>{date}</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: item.status === 'Resolved' ? '#10b981' : '#f59e0b' }
          ]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <Text style={[styles.subject, { color: theme.text }]}>{item.subject}</Text>
        <Text style={[styles.description, { color: theme.text }]}>{item.description}</Text>
        <Text style={[styles.email, { color: theme.placeholder }]}>
          From: {item.userName || 'Anonymous'} ({item.userEmail})
        </Text>

        {item.status !== 'Resolved' && (
          <TouchableOpacity 
            style={styles.resolveButton} 
            onPress={() => handleMarkResolved(item.id, item.status)}
          >
            <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Complaints</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={complaints}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.placeholder }]}>No complaints found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subject: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  email: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  resolveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
