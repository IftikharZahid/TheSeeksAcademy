import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../api/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { scale } from '../../utils/responsive';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { markDiaryAsRead, persistReadDiaryIds, DiaryEntry, initDiariesListener } from '../../store/slices/notificationsSlice';

const generateWeekDays = () => {
  const today = new Date();
  const days = [];
  const currentDay = today.getDay(); // 0 is Sunday
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Get Monday
  const startOfWeek = new Date(today.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0); // reset time
  
  for(let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
};

export const DiaryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const profile = useAppSelector((state) => state.auth.profile);
  const dispatch = useAppDispatch();
  const readDiaryIds = useAppSelector((state) => state.notifications.readDiaryIds);
  const entries = useAppSelector((state) => state.notifications.diaries);
  const loading = useAppSelector((state) => state.notifications.loading);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const weekDays = React.useMemo(() => generateWeekDays(), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const unsubDiaries = initDiariesListener(dispatch, profile?.class);
      await new Promise((r) => setTimeout(r, 1000)); // wait for fetch
      unsubDiaries();
    } catch (e) {
      console.warn('Error refreshing diaries:', e);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, profile]);



  // Mark Diaries as Read
  const handleViewDiary = (docId: string) => {
    setExpandedId(expandedId === docId ? null : docId);
    if (!readDiaryIds.includes(docId)) {
      dispatch(markDiaryAsRead(docId));
      persistReadDiaryIds([...readDiaryIds, docId]).catch(() => {});
    }
  };

  const renderEntry = ({ item }: { item: DiaryEntry }) => {
    const isUnread = !readDiaryIds.includes(item.id);
    const isExpanded = expandedId === item.id;
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconWrap, { backgroundColor: isDark ? '#8b5cf620' : '#e0e7ff' }]}>
              <Ionicons name="book-outline" size={scale(18)} color="#8b5cf6" />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                {item.subject}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardDate, { color: theme.textTertiary }]}>
            {item.date ? new Date(item.date).toLocaleDateString() : ''}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        
        {isExpanded ? (
          <>
            <Text style={[styles.cardDetails, { color: theme.text }]} selectable>
              {item.details}
            </Text>
            <TouchableOpacity 
              style={[styles.viewButton, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, marginTop: scale(10) }]}
              onPress={() => handleViewDiary(item.id)}
            >
              <Text style={[styles.viewButtonText, { color: theme.text }]}>Close</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.viewRow}>
            <Text style={[styles.cardDetails, { color: theme.textSecondary, flex: 1 }]} numberOfLines={2}>
              {item.details}
            </Text>
            <TouchableOpacity 
              style={[
                styles.viewButton, 
                { backgroundColor: isUnread ? '#22c55e' : theme.primary }
              ]}
              onPress={() => handleViewDiary(item.id)}
            >
              <Text style={[styles.viewButtonText, { color: '#fff' }]}>View</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const filteredEntries = entries.filter(entry => {
    if (!entry.date) return false;
    return new Date(entry.date).toDateString() === selectedDate.toDateString();
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar backgroundColor={theme.card} barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Daily Diary</Text>
        <TouchableOpacity style={styles.backButton} onPress={onRefresh} disabled={refreshing}>
          <Ionicons name="refresh" size={scale(22)} color={refreshing ? theme.textTertiary : theme.text} />
        </TouchableOpacity>
      </View>

      {/* Weekly Calendar Filter */}
      <View style={[styles.calendarContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.calendarRow}>
          {weekDays.map((day, index) => {
            const isSelected = selectedDate.toDateString() === day.toDateString();
            const isToday = new Date().toDateString() === day.toDateString();
            const isSunday = day.getDay() === 0;

            if (isSunday) {
              return (
                <View
                  key={index}
                  style={[
                    styles.dayButton,
                    { backgroundColor: isDark ? '#3f1d1d' : '#fee2e2' }
                  ]}
                >
                  <Text style={[styles.dayName, { color: '#ef4444' }]} numberOfLines={1}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3)}
                  </Text>
                  <Text style={[styles.dayNumber, { color: '#ef4444', fontSize: scale(10) }]}>
                    OFF
                  </Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  isSelected ? { backgroundColor: theme.primary } : { backgroundColor: 'transparent' }
                ]}
                onPress={() => setSelectedDate(day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayName,
                  isSelected ? { color: '#fff' } : { color: theme.textSecondary }
                ]} numberOfLines={1}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3)}
                </Text>
                <Text style={[
                  styles.dayNumber,
                  isSelected ? { color: '#fff' } : { color: theme.text }
                ]}>
                  {day.getDate()}
                </Text>
                {isToday && <View style={[styles.todayDot, isSelected ? { backgroundColor: '#fff' } : { backgroundColor: theme.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main Content */}
      {entries.length === 0 && loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={scale(60)} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No diary entries found for {selectedDate.toLocaleDateString()}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
  },
  backButton: { padding: scale(4) },
  headerTitle: { fontSize: scale(18), fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: scale(10), fontSize: scale(14), fontWeight: '500' },
  listContainer: { padding: scale(16), paddingBottom: scale(40) },
  
  calendarContainer: {
    borderBottomWidth: 1,
    paddingVertical: scale(6),
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(10),
  },
  dayButton: {
    flex: 1,
    height: scale(50),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: scale(2),
  },
  dayName: {
    fontSize: scale(9.5),
    fontWeight: '600',
    marginBottom: scale(1),
  },
  dayNumber: {
    fontSize: scale(13),
    fontWeight: '700',
  },
  todayDot: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    position: 'absolute',
    bottom: scale(4),
  },

  card: {
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(8),
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  cardTitle: { fontSize: scale(14), fontWeight: '700', marginBottom: scale(1) },
  cardSubtitle: { fontSize: scale(11), fontWeight: '500' },
  cardDate: { fontSize: scale(10), fontWeight: '500', marginTop: scale(2) },
  divider: { height: 1, marginVertical: scale(8) },
  cardDetails: { fontSize: scale(12), lineHeight: scale(18) },
  viewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(4),
  },
  viewButton: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(6),
    borderRadius: scale(6),
    marginLeft: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
});

export default DiaryScreen;
