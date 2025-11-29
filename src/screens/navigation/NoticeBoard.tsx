import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notices, NoticeScreen } from '../NoticesScreen';

export const NoticeboardSection: React.FC = () => {

  const getTagColor = (type: string) => {
    switch (type) {
      case 'alert': return '#FF4B4B';
      case 'fee': return '#F59E0B';
      case 'exam': return '#2563EB';
      default: return '#6366F1';
    }
  };

  const renderNotice = ({ item }: { item: NoticeScreen }) => (
    <View style={styles.card}>
      
      {/* Tag */}
      <View
        style={[styles.tag, { backgroundColor: getTagColor(item.type) }]}
      >
        <Text style={styles.tagText}>
          {item.type.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.message}>{item.message}</Text>

      <Text style={styles.date}>{item.date}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.content}>
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          renderItem={renderNotice}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        />
      </View>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
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
    color: '#4B5563',
    marginBottom: 10,
  },

  date: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
});

export default NoticeboardSection;
