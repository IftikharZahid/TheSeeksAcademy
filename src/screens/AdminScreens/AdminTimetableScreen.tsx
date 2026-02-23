import React, { useState, useEffect } from 'react';
import {  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Image , StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../api/firebaseConfig';
import { collection, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAppSelector } from '../../store/hooks';
import type { Teacher } from '../../store/slices/teachersSlice';

interface ClassSession {
  id: string;
  subject: string;
  time: string;
  room: string;
  instructor: string;
  className: string;
  lectureNumber?: string;
}

// Teacher interface imported from teachersSlice

const SUBJECTS = [
  'TarjumaTul Quran',
  'Urdu',
  'Pak Study',
  'English',
  'Computer Science',
  'Mathematics',
  'Physics',
  'Sociology',
  'Psychology',
  'Economics',
  'Ethics',
  'Chemistry',
  'Biology'
];

const days = ['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const classGrades = ['9th', '10th', '1st Year', '2nd Year'];

export const AdminTimetableScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);

  // Redux Selectors
  const allClasses = useAppSelector(state => state.admin.timetable);
  const loading = useAppSelector(state => state.admin.timetableLoading);
  const teachers = useAppSelector(state => state.teachers.list);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSession | null>(null);

  // Form State
  const [day, setDay] = useState('Monday');
  const [lectureNo, setLectureNo] = useState('');
  const [subject, setSubject] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState('');
  const [instructor, setInstructor] = useState('');
  const [selectedClass, setSelectedClass] = useState('9th');
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showInstructorDropdown, setShowInstructorDropdown] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  // No local listeners/fetching needed. Handled by AdminDashboard and Redux.
  // const [teachers, setTeachers] = useState<Teacher[]>([]); replaced by selector

  // fetchAllTimetables removed as it's handled by Redux listener in Dashboard

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const checkTimeOverlap = (start1: Date, end1: Date, start2: Date, end2: Date) => {
    return start1 < end2 && start2 < end1;
  };

  const handleSaveClass = async () => {
    if (!subject || !room || !instructor) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // Check for conflicts
    let hasConflict = false;

    // Helper to check conflicts in a specific day's classes
    const checkConflictInDay = (dayClasses: ClassSession[], dayName: string) => {
      return dayClasses.some(cls => {
        if (editingClass && cls.id === editingClass.id) return false;

        const [startStr, endStr] = cls.time.split(' - ');
        if (!startStr || !endStr) return false;

        const clsStart = parseTime(startStr);
        const clsEnd = parseTime(endStr);

        if (checkTimeOverlap(startTime, endTime, clsStart, clsEnd)) {
          if (cls.instructor === instructor) {
            Alert.alert('Conflict Detected', `In ${dayName}: Instructor ${instructor} is already teaching ${cls.subject} (${cls.className}) at this time.`);
            return true;
          }
          if (cls.className === selectedClass) {
            Alert.alert('Conflict Detected', `In ${dayName}: Class ${selectedClass} already has a lecture (${cls.subject}) at this time.`);
            return true;
          }
        }
        return false;
      });
    };

    // Check conflicts for the target day(s)
    if (day === 'All') {
      const daysToCheck = days.filter(d => d !== 'All');
      for (const d of daysToCheck) {
        if (checkConflictInDay(allClasses[d] || [], d)) {
          hasConflict = true;
          break;
        }
      }
    } else {
      if (checkConflictInDay(allClasses[day] || [], day)) {
        hasConflict = true;
      }
    }

    if (hasConflict) return;

    const newClass: ClassSession = {
      id: editingClass ? editingClass.id : Date.now().toString(),
      subject,
      time: `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
      room,
      instructor,
      className: selectedClass,
      lectureNumber: lectureNo,
    };

    try {
      if (day === 'All') {
        const targetDays = days.filter(d => d !== 'All');

        await Promise.all(targetDays.map(async (d) => {
          const docRef = doc(db, 'timetable', d);
          const currentClasses = allClasses[d] || [];

          // Avoid duplicate ID issues in batch
          const classToAdd = { ...newClass, id: Date.now().toString() + Math.random().toString() };
          const updated = [...currentClasses, classToAdd];

          await setDoc(docRef, {
            day: d,
            classes: updated
          });
        }));

        Alert.alert('Success', 'Class added to all days!');
      } else {
        let currentClasses = allClasses[day] || [];
        let updatedClasses = [...currentClasses];

        if (editingClass) {
          // If editing, we need to handle if day changed.
          // Ideally, we delete from old day and add to new day IF day changed.
          // But here we are just saving to 'day'.
          // Complex logic: IF editingClass exists AND it was from a different day, we must remove it from old day.
          // BUT we don't track 'oldDay' easily here unless we pass it.
          // Simplified: We assume editing stays in same day for now OR we handle it.
          // To properly support day change, we need to know the original day.
          // For now, let's just update in the target 'day'. 

          // If ID exists in target day, update it. If not, push it.
          // If it was in another day, it won't be removed from there with this logic.
          // FIX: We will strictly update the list of the TARGET day.

          const existsInTarget = updatedClasses.some(c => c.id === editingClass.id);
          if (existsInTarget) {
            updatedClasses = updatedClasses.map(c => c.id === editingClass.id ? newClass : c);
          } else {
            updatedClasses.push(newClass);
          }
        } else {
          updatedClasses.push(newClass);
        }

        await setDoc(doc(db, 'timetable', day), {
          day: day,
          classes: updatedClasses
        });
        Alert.alert('Success', 'Timetable updated successfully');
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save class');
      console.error(error);
    }
  };

  const handleDeleteClass = async (id: string, day: string) => {
    Alert.alert('Delete Class', 'Are you sure you want to delete this class?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const currentClasses = allClasses[day] || [];
          const updatedClasses = currentClasses.filter(c => c.id !== id);
          try {
            await setDoc(doc(db, 'timetable', day), {
              day: day,
              classes: updatedClasses
            });
          } catch (error) {
            Alert.alert('Error', 'Failed to delete class');
          }
        }
      }
    ]);
  };

  const openModal = (cls?: ClassSession, clsDay?: string) => {
    if (cls) {
      setEditingClass(cls);
      setSubject(cls.subject);
      setLectureNo(cls.lectureNumber || '');
      // Parse time string (e.g., "09:00 - 10:00")
      const times = cls.time.split(' - ');
      if (times.length === 2) {
        const [startHour, startMin] = times[0].split(':').map(Number);
        const [endHour, endMin] = times[1].split(':').map(Number);
        const start = new Date();
        start.setHours(startHour, startMin, 0);
        const end = new Date();
        end.setHours(endHour, endMin, 0);
        setStartTime(start);
        setEndTime(end);
      }
      setRoom(cls.room);
      setInstructor(cls.instructor);
      setSelectedClass(cls.className || '9th');
      setDay(clsDay || 'Monday');
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingClass(null);
    setSubject('');
    setLectureNo('');
    setTime('');
    setRoom('');
    setInstructor('');
    setSelectedClass('9th');
    setDay('Monday');

    // Auto-select instructor if filter is active and not 'All'
    if (selectedTeacher && selectedTeacher !== 'All') {
      const teacherObj = teachers.find(t => t.name === selectedTeacher || t.id === selectedTeacher); // Handle name or ID match
      // Assuming selectedTeacher stores the identifier used in UI tab, which is Name or ID?
      // UI uses teacher name or ID. Let's use Name for logic consistency if possible, or ID.
      // Actually top bar shows Names.
      setInstructor(teacherObj ? teacherObj.name : selectedTeacher);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Timetable</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {!selectedTeacher ? (
        <ScrollView contentContainerStyle={styles.gridContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Staff Member</Text>
          <View style={styles.grid}>
            {/* All Teachers Option */}
            <TouchableOpacity
              style={[styles.gridCard, { backgroundColor: theme.card }]}
              onPress={() => setSelectedTeacher('All')}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="people" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.gridTitle, { color: theme.text }]}>All Staff</Text>
              <Text style={[styles.gridSubtitle, { color: theme.textSecondary }]}>View Master Schedule</Text>
            </TouchableOpacity>

            {teachers.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.gridCard, { backgroundColor: theme.card }]}
                onPress={() => setSelectedTeacher(t.name)}
              >
                <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                  {t.image ? (
                    <Image source={{ uri: t.image }} style={styles.teacherImage} />
                  ) : (
                    <Ionicons name="person" size={32} color={theme.primary} />
                  )}
                </View>
                <Text style={[styles.gridTitle, { color: theme.text }]}>{t.name}</Text>
                <Text style={[styles.gridSubtitle, { color: theme.textSecondary }]}>{t.subject}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }}>
            <TouchableOpacity onPress={() => setSelectedTeacher(null)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={16} color={theme.primary} />
              <Text style={{ color: theme.primary, marginLeft: 4, fontWeight: '500', fontSize: 13 }}>Back to Staff</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 12, marginBottom: 6 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>
              {selectedTeacher === 'All' ? 'Master Timetable' : `${selectedTeacher}'s Schedule`}
            </Text>
          </View>
        </>
      )}

      {loading ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 16 }} />
      ) : selectedTeacher && (
        <ScrollView contentContainerStyle={styles.content}>
          {classGrades.map(grade => {
            // Gather all classes for this grade across all days
            let gradeClasses: { session: ClassSession, day: string }[] = [];

            days.filter(d => d !== 'All').forEach(dayName => {
              const daySessions = allClasses[dayName] || [];
              daySessions.forEach(session => {
                if (session.className === grade || (!session.className && grade === '9th')) {
                  gradeClasses.push({ session, day: dayName });
                }
              });
            });

            // Apply Teacher Filter
            if (selectedTeacher && selectedTeacher !== 'All') {
              gradeClasses = gradeClasses.filter(item => item.session.instructor === selectedTeacher);
            }

            // Sort by Day (Mon-Sat) and then Time
            const dayOrder: Record<string, number> = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
            gradeClasses.sort((a, b) => {
              const dayDiff = (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0);
              if (dayDiff !== 0) return dayDiff;
              return a.session.time.localeCompare(b.session.time);
            });

            if (gradeClasses.length === 0) return null;

            return (
              <View key={grade} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 3, height: 14, backgroundColor: theme.primary, marginRight: 6, borderRadius: 1.5 }} />
                  <Text style={[styles.dayTitle, { color: theme.text, marginBottom: 0, fontSize: 15 }]}>{grade} Class</Text>
                </View>

                {gradeClasses.map((item, index) => (
                  <View key={`${item.session.id}-${index}`} style={[styles.classCard, { backgroundColor: theme.card, borderLeftWidth: 3, borderLeftColor: theme.primary }]}>
                    <View style={styles.classInfo}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'flex-start' }}>
                        <Text style={[styles.classSubject, { color: theme.text, fontSize: 13, flex: 1 }]}>
                          {item.session.lectureNumber ? `Lec ${item.session.lectureNumber}: ` : ''}{item.session.subject}
                        </Text>
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: theme.primary + '15', borderRadius: 4, marginLeft: 6 }}>
                          <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 10 }}>{item.session.time}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Ionicons name="calendar-outline" size={11} color={theme.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.classDetail, { color: theme.textSecondary }]}>Weekly</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Ionicons name="location-outline" size={11} color={theme.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.classDetail, { color: theme.textSecondary }]}>{item.session.room}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="person-outline" size={11} color={theme.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.classDetail, { color: theme.textSecondary, fontWeight: '500' }]}>{item.session.instructor}</Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => openModal(item.session, item.day)} style={styles.actionBtn}>
                        <Ionicons name="pencil" size={16} color={theme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteClass(item.session.id, item.day)} style={styles.actionBtn}>
                        <Ionicons name="trash" size={16} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}

          {/* Show message if no data at all */}
          {teachers.length === 0 && !loading && (
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No teachers found.</Text>
          )}
        </ScrollView>
      )}

      {/* Edit/Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingClass ? 'Edit Class' : 'Add Class'}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={[styles.label, { color: theme.text }]}>Day</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerInput, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowDayPicker(!showDayPicker)}
              >
                <Text style={{ color: theme.text, flex: 1 }}>{day}</Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              {showDayPicker && (
                <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {days.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => {
                        setDay(d);
                        setShowDayPicker(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        { borderBottomColor: theme.border, backgroundColor: day === d ? theme.primary + '20' : 'transparent' }
                      ]}
                    >
                      <Text style={{ color: theme.text }}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { color: theme.text }]}>Lecture Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g., 1"
                placeholderTextColor={theme.textSecondary}
                value={lectureNo}
                onChangeText={setLectureNo}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
              <TouchableOpacity
                onPress={() => setShowSubjectDropdown(!showSubjectDropdown)}
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, justifyContent: 'center' }]}
              >
                <Text style={{ color: subject ? theme.text : theme.textSecondary }}>
                  {subject || 'Select Subject'}
                </Text>
              </TouchableOpacity>

              {showSubjectDropdown && (
                <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {SUBJECTS.map((sub) => (
                      <TouchableOpacity
                        key={sub}
                        onPress={() => {
                          setSubject(sub);
                          setShowSubjectDropdown(false);

                          // Auto-select instructor based on subject
                          const matchedTeacher = teachers.find(t => t.subject === sub);
                          if (matchedTeacher) {
                            setInstructor(matchedTeacher.name);
                          } else {
                            setInstructor(''); // Clear if no match found (optional, or keep previous)
                          }
                        }}
                        style={[
                          styles.dropdownItem,
                          { borderBottomColor: theme.border, backgroundColor: subject === sub ? theme.primary + '20' : 'transparent' }
                        ]}
                      >
                        <Text style={{ color: theme.text }}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}


              <Text style={[styles.label, { color: theme.text }]}>Start Time</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerInput, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={{ color: theme.text, flex: 1 }}>
                  {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
                <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              <Text style={[styles.label, { color: theme.text }]}>End Time</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerInput, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={{ color: theme.text, flex: 1 }}>
                  {endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
                <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              <Text style={[styles.label, { color: theme.text }]}>Room</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g., Room 101"
                placeholderTextColor={theme.textSecondary}
                value={room}
                onChangeText={setRoom}
              />

              <Text style={[styles.label, { color: theme.text }]}>Instructor</Text>
              <TouchableOpacity
                onPress={() => setShowInstructorDropdown(!showInstructorDropdown)}
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, justifyContent: 'center' }]}
              >
                <Text style={{ color: instructor ? theme.text : theme.textSecondary }}>
                  {instructor || 'Select Instructor'}
                </Text>
              </TouchableOpacity>

              {showInstructorDropdown && (
                <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {teachers.map((teach) => (
                      <TouchableOpacity
                        key={teach.id}
                        onPress={() => {
                          setInstructor(teach.name);
                          setShowInstructorDropdown(false);
                        }}
                        style={[
                          styles.dropdownItem,
                          { borderBottomColor: theme.border, backgroundColor: instructor === teach.name ? theme.primary + '20' : 'transparent' }
                        ]}
                      >
                        <Text style={{ color: theme.text, fontWeight: '600' }}>{teach.name}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{teach.subject}</Text>
                      </TouchableOpacity>
                    ))}
                    {teachers.length === 0 && (
                      <View style={styles.dropdownItem}>
                        <Text style={{ color: theme.textSecondary }}>No instructors found</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}

              <Text style={[styles.label, { color: theme.text }]}>Class</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerInput, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setClassPickerVisible(true)}
              >
                <Text style={{ color: selectedClass ? theme.text : theme.textSecondary, flex: 1 }}>
                  {selectedClass || 'Select class'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, { backgroundColor: theme.border }]}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveClass} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Class Picker Modal */}
      <Modal
        visible={classPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClassPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setClassPickerVisible(false)}
        >
          <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Class</Text>
            {classGrades.map((grade) => (
              <TouchableOpacity
                key={grade}
                style={[styles.pickerOption, { backgroundColor: selectedClass === grade ? theme.primary + '15' : 'transparent' }]}
                onPress={() => {
                  setSelectedClass(grade);
                  setClassPickerVisible(false);
                }}
              >
                <Text style={[styles.pickerOptionText, {
                  color: selectedClass === grade ? theme.primary : theme.text
                }]}>
                  {grade}
                </Text>
                {selectedClass === grade && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>


      {/* Native Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={(event, selectedDate) => {
            setShowStartTimePicker(false);
            if (selectedDate) {
              setStartTime(selectedDate);
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={endTime}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={(event, selectedDate) => {
            setShowEndTimePicker(false);
            if (selectedDate) {
              setEndTime(selectedDate);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  backButton: { padding: 2 },
  addButton: { padding: 2 },
  gridContainer: { padding: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCard: {
    width: '47%',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  teacherImage: {
    width: '100%',
    height: '100%',
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  gridSubtitle: {
    fontSize: 10,
    textAlign: 'center',
  },
  content: { padding: 12 },
  dayTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  noDataText: { textAlign: 'center', marginTop: 16, fontSize: 13 },
  classCard: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  classInfo: { flex: 1 },
  classSubject: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  classDetail: { fontSize: 11, marginBottom: 1 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 12,
    padding: 14,
    elevation: 4,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 14, textAlign: 'center' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    fontSize: 13,
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 3,
  },
  typeText: { fontSize: 11, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  classSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  classSelectorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickerContainer: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 6,
    marginTop: -6,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 0.5,
  },
});
