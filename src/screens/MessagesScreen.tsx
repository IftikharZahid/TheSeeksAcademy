import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface Message {
  id: string;
  text?: string;
  type: 'sent' | 'received' | 'voice';
  timestamp: string;
  isRead?: boolean;
  duration?: string;
}

export const MessagesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [message, setMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // Sample messages - Extended for scrolling test
  const messages: Message[] = [
    {
      id: '1',
      text: 'Hi Coach, are you available for a session this week?',
      type: 'sent',
      timestamp: 'Sat, 01:02 AM',
      isRead: true,
    },
    {
      id: '2',
      text: 'Hello! Yes, I have openings on Wednesday and Friday evening. Which works better for you?',
      type: 'received',
      timestamp: 'Sat, 01:02 AM',
    },
    {
      id: '3',
      text: 'Friday evening sounds good. What time do you suggest?',
      type: 'sent',
      timestamp: 'Sat, 01:05 AM',
      isRead: true,
    },
    {
      id: '4',
      text: "Great! I've confirmed your session for Friday at 7:00 PM. Looking forward to it!",
      type: 'received',
      timestamp: 'Sat, 01:04 AM',
    },
    {
      id: '5',
      type: 'voice',
      timestamp: 'Sat, 01:05 AM',
      isRead: true,
      duration: '00:16',
    },
    {
      id: '6',
      text: 'Perfect! Should I bring any materials or notes?',
      type: 'sent',
      timestamp: 'Sat, 01:06 AM',
      isRead: true,
    },
    {
      id: '7',
      text: 'Just bring your textbook and any questions you have. We\'ll work through them together.',
      type: 'received',
      timestamp: 'Sat, 01:07 AM',
    },
    {
      id: '8',
      text: 'Sounds great! I have quite a few questions about the recent assignment.',
      type: 'sent',
      timestamp: 'Sat, 01:08 AM',
      isRead: true,
    },
    {
      id: '9',
      text: 'That\'s perfect. We can focus on those areas where you need the most help.',
      type: 'received',
      timestamp: 'Sat, 01:08 AM',
    },
    {
      id: '10',
      text: 'Thank you so much! I really appreciate your time.',
      type: 'sent',
      timestamp: 'Sat, 01:09 AM',
      isRead: true,
    },
    {
      id: '11',
      text: 'You\'re welcome! See you Friday at 7:00 PM. Don\'t forget to review chapters 5 and 6.',
      type: 'received',
      timestamp: 'Sat, 01:10 AM',
    },
    {
      id: '12',
      text: 'Will do! Thanks for the reminder.',
      type: 'sent',
      timestamp: 'Sat, 01:10 AM',
      isRead: true,
    },
    {
      id: '13',
      text: 'By the way, how are you doing with the Math assignment from last week?',
      type: 'received',
      timestamp: 'Sat, 01:12 AM',
    },
    {
      id: '14',
      text: 'I finished it! It was challenging but I think I got most of it right.',
      type: 'sent',
      timestamp: 'Sat, 01:13 AM',
      isRead: true,
    },
    {
      id: '15',
      text: 'Excellent! We can review it during our session to make sure everything is correct.',
      type: 'received',
      timestamp: 'Sat, 01:14 AM',
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        
        <View style={styles.profileInfo}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={require('../assets/profile.jpg')} 
              style={styles.profileImage} 
            />
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>Iftikhar Zahid</Text>
            <Text style={styles.status}>Online</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📞</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <View style={styles.messagesWrapper}>
        <ScrollView 
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View key={msg.id}>
              {msg.type === 'voice' ? (
                <View style={[styles.messageRow, styles.messageRowSent]}>
                  <View style={[styles.messageBubble, styles.sentBubble, styles.voiceBubble]}>
                    <TouchableOpacity 
                      style={styles.playButton}
                      onPress={() => setIsPlaying(!isPlaying)}
                    >
                      <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                    </TouchableOpacity>
                    <View style={styles.waveform}>
                      {[...Array(20)].map((_, i) => (
                        <View 
                          key={i} 
                          style={[
                            styles.waveformBar,
                            { height: Math.random() * 20 + 8 }
                          ]} 
                        />
                      ))}
                    </View>
                    <Text style={styles.duration}>{msg.duration}</Text>
                  </View>
                  <View style={styles.messageFooter}>
                    <Text style={styles.timestamp}>{msg.timestamp}</Text>
                    {msg.isRead && <Text style={styles.checkmarks}>✓✓</Text>}
                  </View>
                </View>
              ) : (
                <View style={[
                  styles.messageRow,
                  msg.type === 'sent' ? styles.messageRowSent : styles.messageRowReceived
                ]}>
                  <View style={[
                    styles.messageBubble,
                    msg.type === 'sent' ? styles.sentBubble : styles.receivedBubble
                  ]}>
                    <Text style={[
                      styles.messageText,
                      msg.type === 'sent' && styles.sentText
                    ]}>
                      {msg.text}
                    </Text>
                  </View>
                  <View style={styles.messageFooter}>
                    <Text style={styles.timestamp}>{msg.timestamp}</Text>
                    {msg.type === 'sent' && msg.isRead && (
                      <Text style={styles.checkmarks}>✓✓</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Type message..."
            placeholderTextColor="#9ca3af"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          
          {message.trim() ? (
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.voiceButton}>
              <Text style={styles.voiceIcon}>🎤</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backIcon: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: -4,
  },
  profileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    color: '#e8e5ff',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
  },
  messagesWrapper: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    marginBottom: 16,
  },
  messageRowSent: {
    alignItems: 'flex-end',
  },
  messageRowReceived: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  sentBubble: {
    backgroundColor: '#8b5cf6',
    borderBottomRightRadius: 4,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  receivedBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  sentText: {
    color: '#ffffff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
  },
  checkmarks: {
    fontSize: 12,
    color: '#8b5cf6',
  },
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 240,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playIcon: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 2,
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  waveformBar: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 1,
  },
  duration: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  attachButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachIcon: {
    fontSize: 20,
    transform: [{ rotate: '-45deg' }],
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#374151',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  voiceButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  voiceIcon: {
    fontSize: 24,
  },
});