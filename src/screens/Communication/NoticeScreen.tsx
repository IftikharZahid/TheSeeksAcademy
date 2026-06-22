import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image, ActivityIndicator, Modal, Linking, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { markAsRead, persistReadIds, selectUnreadCount, Notice } from '../../store/slices/notificationsSlice';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../../utils/responsive';

export const NoticesScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { notices, loading, readIds } = useAppSelector(state => state.notifications);
  const unreadCount = useAppSelector(state => selectUnreadCount(state.notifications.notices, state.notifications.readIds));
  const isRead = (id: string) => readIds.includes(id);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handlePressLink = async (url: string) => {
    let fullUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      fullUrl = `https://${url}`;
    }
    try {
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert('Error', `Cannot open URL: ${url}`);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const renderNoticeText = (text: string, accentColor: string, isMultiline: boolean) => {
    if (!text) return null;
    const tokenRegex = /(\[(.*?)\]\(((?:https?:\/\/|www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s)]*)\))|((?:https?:\/\/|www\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/gi;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, matchIndex)
        });
      }
      if (match[1]) {
        parts.push({
          type: 'link',
          label: match[2],
          url: match[3]
        });
      } else if (match[4]) {
        parts.push({
          type: 'link',
          label: match[4],
          url: match[4]
        });
      }
      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    return (
      <Text style={[styles.noticeMessage, { color: theme.textSecondary }]} numberOfLines={isMultiline ? undefined : 3}>
        {parts.map((part, index) => {
          if (part.type === 'link') {
            return (
              <Text
                key={index}
                style={{
                  color: accentColor || theme.primary,
                  textDecorationLine: 'underline',
                  fontWeight: '700',
                }}
                onPress={() => handlePressLink(part.url!)}
              >
                {part.label}
              </Text>
            );
          }
          return part.content;
        })}
      </Text>
    );
  };

  const targetNoticeId = route.params?.noticeId;

  useEffect(() => {
    if (targetNoticeId && notices.length > 0) {
      const targetNotice = notices.find(n => n.id === targetNoticeId);
      if (targetNotice) {
        dispatch(markAsRead(targetNoticeId));
        if (!readIds.includes(targetNoticeId)) {
          persistReadIds([...readIds, targetNoticeId]);
        }
      }
      navigation.setParams({ noticeId: undefined });
    }
  }, [targetNoticeId, notices, readIds, dispatch, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      // Hide tab bar and header immediately when entering screen
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' },
        headerShown: false,
      });

      return () => {
        // Restore tab bar and header when leaving screen
        navigation.getParent()?.setOptions({
          tabBarStyle: undefined,
          headerShown: true,
        });
      };
    }, [navigation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Refresh triggered from parent context ideally or just simulate
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handlePress = (item: Notice) => {
    dispatch(markAsRead(item.id));
    if (!readIds.includes(item.id)) {
      persistReadIds([...readIds, item.id]);
    }
    setSelectedNotice(item);
    setShowDetailsModal(true);
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
            backgroundColor: 'rgba(0,0,0,0.08)',
            height: isLast ? '50%' : '100%'
          }]} />
          <View style={[styles.timelineBullet, { backgroundColor: accentColor, borderColor: theme.background }]}>
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
          activeOpacity={0.85}
          onPress={() => handlePress(item)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Text style={[styles.noticeTitle, { color: accentColor }]} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.metadataRow}>
                <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>
                  {item.timeAgo}
                </Text>
                {!read && <View style={styles.unreadDot} />}
              </View>
            </View>
          </View>

          <View style={styles.cardBody}>
            {renderNoticeText(item.message, accentColor, false)}
          </View>
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

      {/* ── Custom Notice Details Popup Modal ── */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDetailsModal(false)}
        >
          <View style={[styles.modalCardContainer, { backgroundColor: theme.card }]}>
            {/* Top Indicator */}
            <View style={[styles.sheetIndicator, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
            
            {/* Header info */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                {selectedNotice && renderAvatar(selectedNotice)}
                <View style={{ marginLeft: scale(10), flex: 1 }}>
                  <Text style={[styles.modalNoticeTitle, { color: selectedNotice?.iconColor || selectedNotice?.initialsColor || theme.primary }]}>
                    {selectedNotice?.title}
                  </Text>
                  <Text style={[styles.modalTimeAgo, { color: theme.textSecondary }]}>
                    {selectedNotice?.timeAgo}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity onPress={() => setShowDetailsModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={scale(20)} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Description Scroll area */}
            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBodyContent}>
                {selectedNotice && renderNoticeText(
                  selectedNotice.message, 
                  selectedNotice.iconColor || selectedNotice.initialsColor || theme.primary, 
                  true
                )}
              </View>
            </ScrollView>

            {/* Action buttons (Close) */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: selectedNotice?.iconColor || selectedNotice?.initialsColor || theme.primary }]}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close Notice</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    padding: scale(12),
    paddingBottom: scale(80),
  },

  // Timeline Styles
  timelineContainer: {
    flexDirection: 'row',
    marginBottom: scale(1),
  },
  timelineLeft: {
    width: scale(22),
    alignItems: 'center',
    marginRight: scale(4),
  },
  timelineLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    left: '50%',
    marginLeft: -0.75,
    zIndex: 0,
  },
  timelineBullet: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    borderWidth: 1.5,
    marginTop: scale(15), // Perfectly aligns with compact title
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerBullet: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#fff',
  },

  // Card Styles
  noticeCard: {
    flex: 1,
    borderRadius: scale(10),
    padding: scale(10), // Clean, compact vertical & horizontal padding
    marginBottom: scale(10),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 3.5,
  },
  cardHeader: {
    marginBottom: scale(3),
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticeTitle: {
    fontSize: scale(13.5),
    fontWeight: '700',
    letterSpacing: -0.1,
    flex: 1,
    marginRight: scale(8),
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  timeAgo: {
    fontSize: scale(10.5),
    fontWeight: '600',
    opacity: 0.6,
  },
  cardBody: {
    marginTop: scale(2),
  },
  noticeMessage: {
    fontSize: scale(12),
    lineHeight: scale(17),
    opacity: 0.8,
  },

  avatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#eee',
  },
  initialsContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#ffffff',
    fontSize: scale(13),
    fontWeight: '700',
  },
  iconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
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
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  emptyText: {
    fontSize: scale(16),
    fontWeight: '700',
    marginBottom: scale(6),
  },
  unreadDot: {
    width: scale(7),
    height: scale(7),
    borderRadius: scale(3.5),
    backgroundColor: '#10b981', // Clean modern emerald green dot
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  modalCardContainer: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(16),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sheetIndicator: {
    width: scale(36),
    height: scale(4),
    borderRadius: scale(2),
    alignSelf: 'center',
    marginBottom: scale(14),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(12),
    paddingBottom: scale(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalNoticeTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  modalTimeAgo: {
    fontSize: scale(11),
    fontWeight: '500',
    marginTop: scale(1),
  },
  modalCloseBtn: {
    padding: scale(4),
  },
  modalBodyScroll: {
    marginVertical: scale(6),
  },
  modalBodyContent: {
    paddingVertical: scale(4),
  },
  closeButton: {
    height: scale(40),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(12),
  },
  closeButtonText: {
    color: '#fff',
    fontSize: scale(14),
    fontWeight: '700',
  },
});
