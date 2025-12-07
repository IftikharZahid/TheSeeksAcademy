import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../api/firebaseConfig';
import { collection, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

interface ClassSession {
  id: string;
  subject: string;
  time: string;
  room: string;
  instructor: string;
  className: string;
  lectureNumber?: string;
}

interface Teacher {
  id: string;
  name: string;
  subject: string;
  image?: string;
}

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
  const [allClasses, setAllClasses] = useState<Record<string, ClassSession[]>>({});
  const [loading, setLoading] = useState(true);
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
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    fetchAllTimetables();
    
    // Fetch teachers
    const unsubscribe = onSnapshot(collection(db, 'staff'), (snapshot) => {
      const teacherList: Teacher[] = [];
      snapshot.forEach((doc) => {
        teacherList.push({ id: doc.id, ...doc.data() } as Teacher);
      });
      setTeachers(teacherList);
      // Set default selected teacher if none
      setTeachers(teacherList);
      // Removed default selection to show Grid first
    });

    return () => unsubscribe();
  }, []);

  const fetchAllTimetables = async () => {
    setLoading(true);
    try {
      const timetableData: Record<string, ClassSession[]> = {};
      
      // We need to listen to all days. For simplicity in this 'All View', let's fetch once or set up listeners for all.
      // Setting up listeners for 7 documents is fine.
      const daysToFetch = days.filter(d => d !== 'All'); // All actual days
      
      // Using onSnapshot for real-time updates on all days is complex to manage in a loop with hooks.
      // Easiest approach: Create a single listener via a collection query if possible?
      // Structure is doc per day. collection is 'timetable'.
      // let's listen to the collection.
      
      const unsubscribe = onSnapshot(collection(db, 'timetable'), (snapshot) => {
          const newData: Record<string, ClassSession[]> = {};
          snapshot.forEach(doc => {
              newData[doc.id] = doc.data().classes || [];
          });
          setAllClasses(newData);
          setLoading(false);
      }, (error) => {
          console.error("Fetch error", error);
          setLoading(false);
      });
      
      return () => unsubscribe();

    } catch (error) {
      console.error("Error fetching timetable:", error);
      setLoading(false);
    }
  };

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
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                <TouchableOpacity onPress={() => setSelectedTeacher(null)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="arrow-back" size={20} color={theme.primary} />
                    <Text style={{ color: theme.primary, marginLeft: 4, fontWeight: '600' }}>Back to Staff List</Text>
                </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>
                    {selectedTeacher === 'All' ? 'Master Timetable' : `${selectedTeacher}'s Schedule`}
                </Text>
            </View>
        </>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
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
                   <View key={grade} style={{ marginBottom: 20 }}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                           <View style={{ width: 4, height: 20, backgroundColor: theme.primary, marginRight: 8, borderRadius: 2 }} />
                           <Text style={[styles.dayTitle, { color: theme.text, marginBottom: 0, fontSize: 22 }]}>{grade} Class</Text>
                       </View>
                       
                       {gradeClasses.map((item, index) => (
                           <View key={`${item.session.id}-${index}`} style={[styles.classCard, { backgroundColor: theme.card, borderLeftWidth: 4, borderLeftColor: theme.primary }]}>
                                <View style={styles.classInfo}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                      <Text style={[styles.classSubject, { color: theme.text, fontSize: 18 }]}>
                                        {item.session.lectureNumber ? `Lec ${item.session.lectureNumber}: ` : ''}{item.session.subject}
                                      </Text>
                                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.primary + '20', borderRadius: 6 }}>
                                          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 12 }}>{item.session.time}</Text>
                                      </View>
                                  </View>
                                  
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                      <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                                      <Text style={[styles.classDetail, { color: theme.textSecondary }]}>Weekly</Text>
                                  </View>
                                  
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                      <Ionicons name="location-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                                      <Text style={[styles.classDetail, { color: theme.textSecondary }]}>{item.session.room}</Text>
                                  </View>

                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                      <Ionicons name="person-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                                      <Text style={[styles.classDetail, { color: theme.textSecondary, fontWeight: '500' }]}>{item.session.instructor}</Text>
                                  </View>
                                </View>
                                <View style={styles.cardActions}>
                                  <TouchableOpacity onPress={() => openModal(item.session, item.day)} style={styles.actionBtn}>
                                    <Ionicons name="pencil" size={20} color={theme.primary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleDeleteClass(item.session.id, item.day)} style={styles.actionBtn}>
                                    <Ionicons name="trash" size={20} color={theme.error} />
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
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 4 },
  addButton: { padding: 4 },
  gridContainer: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  teacherImage: {
    width: '100%',
    height: '100%',
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  gridSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  content: { padding: 16 },
  dayTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  noDataText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  classCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Changed from center to flex-start? No, center is fine for row
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  classInfo: { flex: 1 },
  classSubject: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  classDetail: { fontSize: 14, marginBottom: 2 },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  typeText: { fontSize: 12, fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  classSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  classSelectorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: -10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
});
