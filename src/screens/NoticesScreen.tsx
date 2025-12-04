import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export interface Notice {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'alert' | 'fee' | 'exam' | 'general';
}

export const notices: Notice[] = [
  {
    id: '1',
    title: 'Grand Test Series',
    message: 'Grand test will start from 24 November. Prepare your chapters.',
    date: 'Nov 20, 2025',
    type: 'alert'
  },
  {
    id: '2',
    title: 'Fee Reminder',
    message: 'Monthly fee must be submitted before the 10th of each month.',
    date: 'Nov 10, 2025',
    type: 'fee'
  },
  {
    id: '3',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '4',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '5',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '6',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '7',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '8',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '9',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '10',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
];

export const NoticesScreen: React.FC = () => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Mock refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const getTagColor = (type: string) => {
    switch (type) {
      case 'alert': return '#FF4B4B';
      case 'fee': return '#F59E0B';
      case 'exam': return '#2563EB';
      default: return '#6366F1';
    }
  };

  const renderNotice = ({ item }: { item: Notice }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      
      {/* Tag */}
      <View
        style={[styles.tag, { backgroundColor: getTagColor(item.type) }]}
      >
        <Text style={styles.tagText}>
          {item.type.toUpperCase()}
        </Text>
      </View>

      <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{item.message}</Text>

      <Text style={[styles.date, { color: theme.textTertiary }]}>{item.date}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <View style={styles.content}>
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          renderItem={renderNotice}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        />
      </View>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 8,
  },

  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },

  message: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 20,
  },

  date: {
    fontSize: 11,
    marginTop: 4,
  },
});
