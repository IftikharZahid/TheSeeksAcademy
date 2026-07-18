import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { ScreenContainer } from "../../components/layout/ScreenContainer";
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

  const weekDays = React.useMemo(() => generateWeekDays(), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Fetch all diaries and filter on the client to handle complex class/gender naming conventions
      const unsubDiaries = initDiariesListener(dispatch);
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
    if (!readDiaryIds.includes(docId)) {
      dispatch(markDiaryAsRead(docId));
      persistReadDiaryIds([...readDiaryIds, docId]).catch(() => {});
    }
  };

  const renderEntry = ({ item }: { item: DiaryEntry }) => {
    const isUnread = !readDiaryIds.includes(item.id);
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconWrap, { backgroundColor: isDark ? '#8b5cf620' : '#e0e7ff' }]}>
              <Ionicons name="book-outline" size={scale(18)} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1, paddingRight: scale(10) }}>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary, marginTop: scale(2) }]}>
                {item.subject}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.cardDate, { color: theme.textTertiary }]}>
              {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
            </Text>
            {isUnread && (
               <View style={{ marginTop: scale(4), backgroundColor: '#22c55e15', paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(4), borderWidth: 1, borderColor: '#22c55e30' }}>
                 <Text style={{ color: '#22c55e', fontSize: scale(9), fontWeight: '700' }}>NEW</Text>
               </View>
            )}
          </View>
        </View>
        
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        
        <Text style={[styles.cardDetails, { color: theme.text, flex: 1, marginBottom: isUnread ? scale(10) : 0 }]} selectable>
          {item.details}
        </Text>

        {isUnread && (
          <TouchableOpacity 
            style={{ 
              backgroundColor: isDark ? '#22c55e20' : '#f0fdf4', 
              borderColor: '#22c55e40', 
              borderWidth: 1, 
              alignSelf: 'flex-start', 
              paddingHorizontal: scale(12), 
              paddingVertical: scale(6), 
              borderRadius: scale(6), 
              flexDirection: 'row',
              alignItems: 'center'
            }}
            onPress={() => handleViewDiary(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle-outline" size={scale(14)} color="#22c55e" style={{ marginRight: scale(4) }} />
            <Text style={{ color: '#22c55e', fontSize: scale(11), fontWeight: '600' }}>Mark as Read</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const userClass = profile?.class ? profile.class.toLowerCase().trim() : '';
  const userGender = profile?.gender ? profile.gender.toLowerCase().trim() : '';
  
  // Determine user's gender accurately by checking both gender field and class name
  const isMaleUser = ['male', 'boy', 'boys', 'm'].includes(userGender) || userClass.includes('boy') || userClass.includes('male');
  const isFemaleUser = ['female', 'girl', 'girls', 'f'].includes(userGender) || userClass.includes('girl') || userClass.includes('female');

  // Extract base class (e.g., "10th boys" -> "10th")
  const userBaseClass = userClass.replace(/boys?|girls?|male|female/g, '').trim();

  const filteredEntries = entries.filter(entry => {
    if (!entry.date) return false;
    const dateMatch = new Date(entry.date).toDateString() === selectedDate.toDateString();

    const entryClass = (entry.className || '').toLowerCase().trim();
    const rawEntryGender = (entry as any).audience || (entry as any).gender;
    const explicitEntryGender = rawEntryGender ? String(rawEntryGender).toLowerCase().trim() : '';

    // Determine entry's gender
    const isMaleEntry = ['boys', 'boy', 'male', 'm'].includes(explicitEntryGender) || entryClass.includes('boy') || entryClass.includes('male');
    const isFemaleEntry = ['girls', 'girl', 'female', 'f'].includes(explicitEntryGender) || entryClass.includes('girl') || entryClass.includes('female');
    const isAllEntry = explicitEntryGender === 'all' || explicitEntryGender === 'both';

    const entryBaseClass = entryClass.replace(/boys?|girls?|male|female/g, '').trim();

    // Ensure the entry belongs to the user's class
    let matchClass = false;
    if (!userClass || !entryClass) {
      matchClass = true; // Fallback if missing
    } else if (userBaseClass === entryBaseClass || userClass === entryClass) {
      matchClass = true;
    }

    // Ensure the entry belongs to the user's gender
    let matchGender = false;
    if (isAllEntry) {
      matchGender = true;
    } else if (isMaleUser && isMaleEntry) {
      matchGender = true;
    } else if (isFemaleUser && isFemaleEntry) {
      matchGender = true;
    } else if (!isMaleEntry && !isFemaleEntry) {
      // If entry has no specific gender assigned, treat as general for the class
      matchGender = true;
    } else if (userClass === entryClass) {
      // Fallback if class strings match exactly
      matchGender = true;
    }

    // STRICT OVERRIDE: Prevent cross-gender viewing even if audience was accidentally set to 'Both'
    if (isFemaleUser && !isMaleUser && isMaleEntry && !isFemaleEntry) {
      matchGender = false; // Female user cannot see male-only entry
    }
    if (isMaleUser && !isFemaleUser && isFemaleEntry && !isMaleEntry) {
      matchGender = false; // Male user cannot see female-only entry
    }

    return dateMatch && matchClass && matchGender;
  });

  return (
    <ScreenContainer 
      headerTitle="Daily Diary"
      rightAction={
        <TouchableOpacity style={styles.backButton} onPress={onRefresh} disabled={refreshing}>
          <Ionicons name="refresh" size={scale(22)} color={refreshing ? 'rgba(255,255,255,0.5)' : '#ffffff'} />
        </TouchableOpacity>
      }
    >
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
    </ScreenContainer>
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
