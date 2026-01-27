import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useNotifications, Notice } from '../context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../utils/responsive';

export const NoticesScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { notices, loading, isRead, markAsRead, unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Refresh triggered from parent context ideally or just simulate
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handlePress = (item: Notice) => {
    markAsRead(item.id);
  };

  const renderAvatar = (item: Notice) => {
    // Smaller avatar for compact card
    if (item.type === 'image' && item.avatar) {
      return (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      );
    } else if (item.type === 'initials' && item.initials) {
      return (
        <View style={[styles.initialsContainer, { backgroundColor: item.initialsColor }]}>
          <Text style={styles.initialsText}>{item.initials}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.iconContainer, { backgroundColor: item.iconBgColor || '#e0e7ff' }]}>
        <Ionicons name={item.iconName as any || 'notifications'} size={scale(20)} color={item.iconColor || '#6366f1'} />
      </View>
    );
  };

  const renderNotice = ({ item, index }: { item: Notice, index: number }) => {
    const accentColor = item.iconColor || item.initialsColor || theme.primary;
    const isLast = index === notices.length - 1;
    const read = isRead(item.id);

    return (
      <View style={styles.timelineContainer}>
        {/* Timeline Left Side */}
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineLine, {
            backgroundColor: 'rgba(0,0,0,0.1)',
            // Don't extend line for last item? design choice.
            // Let's keep it continuous for a connected feed look, or hide closest to bottom.
            height: isLast ? '50%' : '100%'
          }]} />
          <View style={[styles.timelineBullet, { backgroundColor: accentColor, borderColor: theme.background }]}>
            {/* Optional: Tiny Icon inside bullet? Or just a dot. Dot is cleaner for "bullets styling" */}
            <View style={styles.innerBullet} />
          </View>
        </View>

        {/* Card Content */}
        <TouchableOpacity
          style={[
            styles.noticeCard,
            {
              backgroundColor: theme.card,
              shadowColor: theme.shadow,
              borderLeftColor: accentColor
            }
          ]}
          activeOpacity={0.9}
          onPress={() => handlePress(item)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Text style={[styles.noticeTitle, { color: accentColor }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>
                {item.timeAgo}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={[styles.noticeMessage, { color: theme.textSecondary }]} numberOfLines={3}>
              {item.message}
            </Text>
          </View>

          {/* Unread Indicator Green Dot */}
          {!read && (
            <View style={styles.unreadDot} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        <TouchableOpacity
          style={[styles.notificationButton, { backgroundColor: theme.card }]}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={scale(22)} color={theme.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={notices}
            keyExtractor={(item) => item.id}
            renderItem={renderNotice}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconContainer, { backgroundColor: theme.card }]}>
                  <Ionicons name="notifications-off-outline" size={scale(48)} color={theme.textSecondary} />
                </View>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No notifications yet</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  notificationButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: '#F44336',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: scale(9),
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    padding: scale(16),
    paddingBottom: scale(100),
  },

  // Timeline Styles
  timelineContainer: {
    flexDirection: 'row',
    marginBottom: scale(1),
  },
  timelineLeft: {
    width: scale(30),
    alignItems: 'center',
    marginRight: scale(1),
  },
  timelineLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ccc',
    left: '50%',
    marginLeft: -1,
    zIndex: 0,
  },
  timelineBullet: {
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    borderWidth: 2,
    marginTop: scale(16), // Align with card title approx
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerBullet: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#fff',
  },

  // Card Styles
  noticeCard: {
    flex: 1,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(12),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 3,
  },
  cardHeader: {
    marginBottom: scale(4),
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticeTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
    marginRight: scale(8),
  },
  timeAgo: {
    position: 'absolute',
    bottom: scale(12),
    right: scale(16),
    fontSize: scale(11),
    fontWeight: '500',
    opacity: 0.5,
  },
  cardBody: {
    marginTop: scale(2),
    paddingBottom: scale(14), // Space for timeAgo
  },
  noticeMessage: {
    fontSize: scale(13),
    lineHeight: scale(19),
    opacity: 0.8,
  },

  avatar: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#eee',
  },
  initialsContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#ffffff',
    fontSize: scale(14),
    fontWeight: '700',
  },
  iconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: scale(80),
    paddingHorizontal: scale(40),
  },
  emptyIconContainer: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  emptyText: {
    fontSize: scale(18),
    fontWeight: '700',
    marginBottom: scale(8),
  },
  unreadDot: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: '#4CAF50', // Green
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
});
