import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  unread: boolean;
}

const messages: Message[] = [
  {
    id: '1',
    sender: 'Admin Office',
    text: 'Your fee submission deadline is approaching.',
    time: '10:45 AM',
    unread: true,
  },
  {
    id: '2',
    sender: 'Ms. Aisha – Python',
    text: 'Assignment 03 has been uploaded. Please check LMS.',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: '3',
    sender: 'Examination Dept.',
    text: 'Mid-term exams will start next week.',
    time: '2 days ago',
    unread: false,
  },
];

export const MessagesScreen: React.FC = () => {
  const renderMessage = ({ item }: { item: Message }) => (
    <TouchableOpacity style={[styles.card, item.unread && styles.unreadCard]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sender}>{item.sender}</Text>
        <Text style={styles.preview} numberOfLines={1}>{item.text}</Text>
      </View>

      <View style={styles.timeContainer}>
        <Text style={styles.time}>{item.time}</Text>
        {item.unread && <View style={styles.unreadDot}></View>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  unreadCard: {
    backgroundColor: "#f3e8ff",
    borderColor: "#d8b4fe",
  },

  sender: {
    fontSize: 15,
    fontWeight: "700",
    color: '#1f2937',
    marginBottom: 4,
  },

  preview: {
    fontSize: 13,
    color: "#6B7280",
    width: "90%",
  },

  timeContainer: {
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  time: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#8b5cf6",
    marginTop: 6,
  },
});