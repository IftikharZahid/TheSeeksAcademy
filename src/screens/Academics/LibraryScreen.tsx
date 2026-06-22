import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Modal, Dimensions, Linking, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../../utils/responsive';
import { markAsRead } from '../../store/slices/notificationsSlice';
import type { Notice } from '../../store/slices/notificationsSlice';

const { width, height } = Dimensions.get('window');

const StatCard = ({ iconName, iconColor, value, label, theme, isDark }: any) => (
  <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, shadowOpacity: isDark ? 0.3 : 0.05 }]}>
    <View style={[styles.statIconWrapper, { backgroundColor: isDark ? iconColor + '30' : iconColor + '15' }]}>
      <Ionicons name={iconName} size={scale(24)} color={iconColor} />
    </View>
    <View>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>{label}</Text>
    </View>
  </View>
);

const DropdownBtn = ({ label, hasIcon = true, onPress, theme }: any) => (
  <TouchableOpacity style={[styles.dropdownBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={onPress}>
    {label === 'Sort' && <Ionicons name="options-outline" size={scale(14)} color={theme.colors.placeholder} style={{ marginRight: 4 }} />}
    <Text style={[styles.dropdownLabel, { color: theme.colors.text }]}>{label}</Text>
    {hasIcon && <Ionicons name="chevron-down" size={scale(14)} color={theme.colors.placeholder} />}
  </TouchableOpacity>
);

const Chip = ({ label, iconName, color, isActive, onPress, theme, isDark }: any) => (
  <TouchableOpacity onPress={onPress} style={[
    styles.chip,
    isActive ? { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' } : { borderColor: isDark ? theme.colors.border : color + '40', backgroundColor: theme.colors.card }
  ]}>
    {iconName && <Ionicons name={iconName} size={scale(14)} color={isActive ? '#fff' : (isDark ? theme.colors.placeholder : color)} style={{ marginRight: scale(4) }} />}
    <Text style={[styles.chipText, { color: isActive ? '#fff' : (isDark ? theme.colors.text : color) }]}>{label}</Text>
  </TouchableOpacity>
);

const renderRichText = (text: string, theme: any, isDark: boolean) => {
    if (!text) return null;
    let escaped = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
    const lines = escaped.split('\n');
    
    return lines.map((line, lineIdx) => {
        let trimmed = line.trim();
        if (!trimmed) return <View key={lineIdx} style={{ height: scale(8) }} />;
        
        let isH1 = trimmed.startsWith('# ');
        let isH2 = trimmed.startsWith('## ');
        let isH3 = trimmed.startsWith('### ');
        let isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        
        let content = trimmed;
        if (isH1) content = trimmed.substring(2);
        else if (isH2) content = trimmed.substring(3);
        else if (isH3) content = trimmed.substring(4);
        else if (isBullet) content = trimmed.substring(2);
        
        let baseStyle: any = { fontSize: scale(13), color: theme.colors.text, lineHeight: scale(20) };
        if (isH1) baseStyle = { fontSize: scale(18), fontWeight: 'bold', color: theme.colors.text, marginTop: scale(12), marginBottom: scale(4) };
        if (isH2) baseStyle = { fontSize: scale(16), fontWeight: 'bold', color: theme.colors.text, marginTop: scale(10), marginBottom: scale(4) };
        if (isH3) baseStyle = { fontSize: scale(14), fontWeight: 'bold', color: theme.colors.text, marginTop: scale(8), marginBottom: scale(2) };
        
        const tokens: any[] = [];
        let remaining = content;
        
        while (remaining.length > 0) {
            const linkMatch = remaining.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
            const rawUrlMatch = remaining.match(/(https?:\/\/[^\s]+)/);
            const boldMatch = remaining.match(/\*\*([^\*]+)\*\*/);
            const boldMatch2 = remaining.match(/__([^_]+)__/);
            const italicMatch = remaining.match(/\*([^\*]+)\*/);
            const italicMatch2 = remaining.match(/_([^_]+)_/);
            
            let bestMatch: any = null;
            let bestIndex = remaining.length;
            let type = '';
            let textValue = '';
            let urlValue = '';
            let matchLength = 0;
            
            const checkMatch = (match: any, t: string) => {
                if (match && match.index < bestIndex) {
                    bestIndex = match.index;
                    bestMatch = match;
                    type = t;
                }
            };
            
            checkMatch(linkMatch, 'md_link');
            checkMatch(rawUrlMatch, 'raw_url');
            checkMatch(boldMatch, 'bold');
            checkMatch(boldMatch2, 'bold');
            checkMatch(italicMatch, 'italic');
            checkMatch(italicMatch2, 'italic');
            
            if (bestMatch) {
                if (bestIndex > 0) {
                    tokens.push({ type: 'text', text: remaining.substring(0, bestIndex) });
                }
                
                if (type === 'md_link') {
                    textValue = bestMatch?.[1] || '';
                    urlValue = bestMatch?.[2] || '';
                    matchLength = bestMatch?.[0]?.length || 0;
                } else if (type === 'raw_url') {
                    textValue = bestMatch?.[0] || '';
                    urlValue = bestMatch?.[0] || '';
                    matchLength = bestMatch?.[0]?.length || 0;
                } else if (type === 'bold') {
                    textValue = bestMatch?.[1] || '';
                    matchLength = bestMatch?.[0]?.length || 0;
                } else if (type === 'italic') {
                    textValue = bestMatch?.[1] || '';
                    matchLength = bestMatch?.[0]?.length || 0;
                }
                
                tokens.push({ type, text: textValue, url: urlValue });
                remaining = remaining.substring(bestIndex + matchLength);
            } else {
                tokens.push({ type: 'text', text: remaining });
                remaining = '';
            }
        }
        
        const lineContent = tokens.map((tok, idx) => {
            if (tok.type === 'md_link' || tok.type === 'raw_url') {
                return <Text key={idx} style={{ color: isDark ? '#60a5fa' : '#2563eb', textDecorationLine: 'underline' }} onPress={() => Linking.openURL(tok.url)}>{tok.text}</Text>;
            }
            if (tok.type === 'bold') return <Text key={idx} style={{ fontWeight: 'bold' }}>{tok.text}</Text>;
            if (tok.type === 'italic') return <Text key={idx} style={{ fontStyle: 'italic' }}>{tok.text}</Text>;
            return <Text key={idx}>{tok.text}</Text>;
        });
        
        if (isBullet) {
            return (
                <View key={lineIdx} style={{ flexDirection: 'row', paddingLeft: scale(8), marginBottom: scale(2) }}>
                    <Text style={[baseStyle, { marginRight: scale(6) }]}>•</Text>
                    <Text style={[baseStyle, { flex: 1 }]}>{lineContent}</Text>
                </View>
            );
        }
        
        return <Text key={lineIdx} style={baseStyle}>{lineContent}</Text>;
    });
};

export const LibraryScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const notices = useAppSelector(state => state.notifications.notices) as Notice[];
  const classesFromStore = useAppSelector((state: any) => state.appSettings?.classes) as string[] || [];
  const subjectsFromStore = useAppSelector((state: any) => state.appSettings?.books) as string[] || [];

  const dispatch = useAppDispatch();
  const readIds = useAppSelector(state => state.notifications.readIds) as string[];
  const unreadCount = notices.filter(n => !readIds.includes(n.id)).length;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('All Classes');
  const [filterSubject, setFilterSubject] = useState<string>('All Subjects');
  const [filterType, setFilterType] = useState<string>('All');
  
  // Modal states
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'Class'|'Subject'>('Class');
  
  // Content View Modal state
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);

  // Use classes and subjects from Redux (synced with admin settings)
  const desiredOrder = ["8th", "9th", "10th", "1st Year", "2nd Year"];
  const availableClasses = [...classesFromStore].sort((a, b) => {
      let indexA = desiredOrder.indexOf(a);
      let indexB = desiredOrder.indexOf(b);
      if (indexA === -1) indexA = 999;
      if (indexB === -1) indexB = 999;
      return indexA - indexB;
  });
  const availableSubjects = subjectsFromStore;

  // Derived stats
  const totalMaterials = notices.length;
  const uniqueClassesCount = availableClasses.length || new Set(notices.map((n: any) => n.targetClass).filter(c => c && c !== 'All')).size;
  const uniqueSubjectsCount = availableSubjects.length || new Set(notices.map((n: any) => n.subject).filter(s => s && s !== 'Select Subject')).size;

  const getSubjectColor = (subject: string) => {
      if (!subject || subject === 'All Subjects' || subject === 'Select Subject') return '#64748b';
      const s = subject.toLowerCase();
      if (s.includes('math')) return '#3b82f6';
      if (s.includes('physic')) return '#8b5cf6';
      if (s.includes('english')) return '#10b981';
      if (s.includes('chemist')) return '#f59e0b';
      if (s.includes('biolog')) return '#ef4444';
      if (s.includes('computer')) return '#06b6d4';
      return '#334155';
  };

  const getClassColor = (className: string) => {
      if (!className || className === 'All Classes' || className === 'Select Class') return '#64748b';
      const c = className.toLowerCase();
      if (c.includes('8th')) return '#06b6d4';
      if (c.includes('9th')) return '#3b82f6';
      if (c.includes('10')) return '#10b981';
      if (c.includes('1st')) return '#f59e0b';
      if (c.includes('2nd')) return '#ef4444';
      return '#8b5cf6';
  };

  const getExtendedData = (notice: any) => {
      const title = notice.title || 'Untitled';
      const c = (notice.message || notice.content || '').toLowerCase();
      let type = 'DOC';
      let typeColor = '#3b82f6';
      let iconName = 'document-text';
      
      if (c.includes('.pdf') || title.toLowerCase().includes('pdf')) { type = 'PDF'; typeColor = '#ef4444'; iconName = 'document'; }
      else if (c.includes('.ppt') || title.toLowerCase().includes('ppt')) { type = 'PPT'; typeColor = '#f59e0b'; iconName = 'easel'; }
      else if (c.includes('video') || title.toLowerCase().includes('video')) { type = 'VIDEO'; typeColor = '#8b5cf6'; iconName = 'play-circle'; }
      else if (c.includes('book') || title.toLowerCase().includes('book')) { type = 'BOOK'; typeColor = '#10b981'; iconName = 'book'; }
      
      return {
          targetClass: notice.targetClass || '9th Grade',
          subject: notice.subject || 'General',
          teacherName: notice.teacherName || 'Super Admin',
          contentBody: notice.content || notice.message || '',
          type, typeColor, iconName
      };
  };

  // Filtered data
  const filteredNotices = notices.filter((n: any) => {
      const ext = getExtendedData(n);
      
      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const tMatch = (n.title || '').toLowerCase().includes(q) || ext.contentBody.toLowerCase().includes(q);
        const sMatch = ext.subject.toLowerCase().includes(q) || ext.targetClass.toLowerCase().includes(q);
        if (!tMatch && !sMatch) return false;
      }
      
      // Class filter
      if (filterClass !== 'All Classes' && ext.targetClass !== filterClass) return false;
      
      // Subject filter
      if (filterSubject !== 'All Subjects' && ext.subject !== filterSubject) return false;
      
      // Type chip filter
      if (filterType !== 'All') {
          if (filterType === 'Notes' && ext.type !== 'DOC') return false;
          if (filterType === 'PDF' && ext.type !== 'PDF') return false;
          if (filterType === 'Books' && ext.type !== 'BOOK') return false;
          if (filterType === 'Videos' && ext.type !== 'VIDEO') return false;
          if (filterType === 'PPT' && ext.type !== 'PPT') return false;
      }
      
      return true;
  });

  const handleViewMaterial = (item: any) => {
      setSelectedMaterial(item);
      setViewModalVisible(true);
      if (!readIds.includes(item.id)) {
          dispatch(markAsRead(item.id));
      }
  };

  const renderMaterial = ({ item }: { item: Notice }) => {
    const ext = getExtendedData(item);
    
    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, shadowOpacity: isDark ? 0.3 : 0.04 }]}>
          <View style={styles.cardLeft}>
            <View style={[styles.docIconWrapper, { backgroundColor: isDark ? theme.colors.background : '#fafafa', borderColor: ext.typeColor + '30' }]}>
              <Ionicons name={ext.iconName as any} size={scale(28)} color={ext.typeColor} />
              <View style={[styles.typeBadge, { backgroundColor: ext.typeColor }]}>
                <Text style={styles.typeBadgeText}>{ext.type}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.cardCenter}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]} numberOfLines={1}>
               <Text style={styles.blueLabel}>Class: </Text>{ext.targetClass}  <Text style={styles.blueLabel}>•  Subject: </Text>
               <Text style={{ color: getSubjectColor(ext.subject), fontWeight: '600' }}>{ext.subject}</Text>
            </Text>
            
            <View style={styles.cardMetaRow}>
              <Ionicons name="calendar-outline" size={scale(12)} color={theme.colors.placeholder} />
              <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>{item.timeAgo || 'Uploaded recently'}</Text>
              <Ionicons name="person-outline" size={scale(12)} color={theme.colors.placeholder} style={{ marginLeft: scale(8) }} />
              <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>{ext.teacherName}</Text>
            </View>
        </View>
        
        <View style={styles.cardRight}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity 
             style={styles.btnViewDownload}
             onPress={() => handleViewMaterial(item)}
          >
            <Text style={styles.btnViewDownloadText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const openPicker = (type: 'Class'|'Subject') => {
      setPickerType(type);
      setPickerModalVisible(true);
  };

  const selectPickerItem = (val: string) => {
      if (pickerType === 'Class') setFilterClass(val);
      else setFilterSubject(val);
      setPickerModalVisible(false);
  };

  return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Hero Header */}
        <View style={styles.headerBackground}>
          <Image 
            source={require('../../../assets/the-seeks-logo.png')} 
            style={{ position: 'absolute', right: -scale(135), top: scale(40), width: scale(430), height: scale(90), opacity: 0.15, resizeMode: 'contain' }} 
          />
        </View>
        
        <SafeAreaView edges={['top']} style={{ zIndex: 10 }}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity 
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  const routes = navigation.getState()?.routeNames || [];
                  if (routes.includes('TeacherDashboardScreen')) {
                    navigation.navigate('TeacherDashboardScreen' as any);
                  } else if (routes.includes('Main')) {
                    navigation.navigate('Main' as any);
                  } else if (routes.includes('Home')) {
                    navigation.navigate('Home' as any);
                  }
                }
              }}
              style={{
                width: scale(40),
                height: scale(40),
                borderRadius: scale(20),
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10
              }}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="chevron-back" size={scale(24)} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>e-Library</Text>
            <TouchableOpacity style={{ padding: scale(8) }}>
              <Ionicons name="notifications-outline" size={scale(24)} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>{unreadCount}</Text></View>
              )}
            </TouchableOpacity>
          </View>
                    <View style={styles.headerSubtitleWrapper}>
               <Text style={styles.headerSubtitle}>Explore study materials, notes & resources</Text>
               <Text style={styles.headerSubtitle}>shared by academy administrators</Text>
            </View>
        </SafeAreaView>
        
        {/* Scrollable Content */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            style={{ flex: 1 }}
          data={filteredNotices}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
               {/* Stats Row */}
               <View style={styles.statsRow}>
               <StatCard iconName="document-text-outline" iconColor="#8b5cf6" value={totalMaterials} label="Materials" theme={theme} isDark={isDark} />
               <StatCard iconName="book-outline" iconColor="#3b82f6" value={uniqueSubjectsCount} label="Subjects" theme={theme} isDark={isDark} />
               <StatCard iconName="school-outline" iconColor="#10b981" value={uniqueClassesCount} label="Classes" theme={theme} isDark={isDark} />
             </View>
             
             {/* Search */}
             <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
               <Ionicons name="search" size={scale(18)} color={theme.colors.placeholder} style={{ marginRight: scale(8) }} />
               <TextInput 
                 style={[styles.searchInput, { color: theme.colors.text }]}
                 placeholder="Search materials by title, subject or class..."
                 placeholderTextColor={theme.colors.placeholder}
                 value={searchQuery}
                 onChangeText={setSearchQuery}
               />
               <TouchableOpacity style={{ padding: scale(4) }}>
                 <Ionicons name="options-outline" size={scale(20)} color={theme.colors.placeholder} />
               </TouchableOpacity>
             </View>
             
             {/* Dropdowns */}
             <View style={styles.dropdownsRow}>
               <DropdownBtn label={filterClass.length > 10 ? filterClass.substring(0,8)+'...' : filterClass} onPress={() => openPicker('Class')} theme={theme} isDark={isDark} />
               <DropdownBtn label={filterSubject.length > 10 ? filterSubject.substring(0,8)+'...' : filterSubject} onPress={() => openPicker('Subject')} theme={theme} isDark={isDark} />
               <DropdownBtn label="Sort" hasIcon={true} theme={theme} isDark={isDark} />
             </View>
             
             {/* Chips Scroll */}
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContainer}>
               <Chip label="All" isActive={filterType === 'All'} onPress={() => setFilterType('All')} theme={theme} isDark={isDark} />
               <Chip label="Notes" iconName="document-text-outline" color="#3b82f6" isActive={filterType === 'Notes'} onPress={() => setFilterType('Notes')} theme={theme} isDark={isDark} />
               <Chip label="PDF" iconName="document-outline" color="#ef4444" isActive={filterType === 'PDF'} onPress={() => setFilterType('PDF')} theme={theme} isDark={isDark} />
               <Chip label="Books" iconName="book-outline" color="#10b981" isActive={filterType === 'Books'} onPress={() => setFilterType('Books')} theme={theme} isDark={isDark} />
               <Chip label="Videos" iconName="play-circle-outline" color="#8b5cf6" isActive={filterType === 'Videos'} onPress={() => setFilterType('Videos')} theme={theme} isDark={isDark} />
               <Chip label="PPT" iconName="easel-outline" color="#f59e0b" isActive={filterType === 'PPT'} onPress={() => setFilterType('PPT')} theme={theme} isDark={isDark} />
             </ScrollView>
          </View>
        }
        renderItem={renderMaterial}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: scale(40) }}>
             <Ionicons name="folder-open-outline" size={scale(48)} color={theme.colors.placeholder} />
             <Text style={{ marginTop: scale(12), color: theme.colors.placeholder, fontSize: scale(14) }}>No materials found</Text>
          </View>
        }
      />
      </KeyboardAvoidingView>

      {/* Dynamic Picker Modal */}
      <Modal visible={pickerModalVisible} transparent={true} animationType="fade">
         <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerModalVisible(false)}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
               <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select {pickerType}</Text>
               <ScrollView style={{ maxHeight: height * 0.5 }}>
                  <TouchableOpacity style={styles.modalOption} onPress={() => selectPickerItem(`All ${pickerType === 'Class' ? 'Classes' : 'Subjects'}`)}>
                     <Text style={[styles.modalOptionText, { color: theme.colors.text }]}>All {pickerType === 'Class' ? 'Classes' : 'Subjects'}</Text>
                  </TouchableOpacity>
                  {(pickerType === 'Class' ? availableClasses : availableSubjects).map((item: any, idx) => {
                      const color = pickerType === 'Subject' ? getSubjectColor(item) : getClassColor(item);
                      return (
                      <TouchableOpacity key={idx} style={styles.modalOption} onPress={() => selectPickerItem(item)}>
                         <View style={[styles.colorDot, { backgroundColor: color }]} />
                         <Text style={[styles.modalOptionText, { color: theme.colors.text }]}>{item}</Text>
                      </TouchableOpacity>
                  )})}
               </ScrollView>
            </View>
         </TouchableOpacity>
      </Modal>

      {/* Material View Modal */}
      <Modal visible={viewModalVisible} transparent={true} animationType="slide">
         <View style={[styles.viewModalContainer, { backgroundColor: theme.colors.background }]}>
            <SafeAreaView edges={['top', 'bottom']} style={[styles.viewModalSafeArea, { backgroundColor: theme.colors.background }]}>
               <View style={[styles.viewModalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.viewModalHeaderTitle, { color: theme.colors.text }]} numberOfLines={1}>{selectedMaterial?.title || 'Material Details'}</Text>
                  <TouchableOpacity onPress={() => setViewModalVisible(false)} style={[styles.closeBtn, { backgroundColor: isDark ? theme.colors.border : '#f1f5f9' }]}>
                     <Ionicons name="close" size={scale(24)} color={theme.colors.text} />
                  </TouchableOpacity>
               </View>
               <ScrollView style={styles.viewModalBody} contentContainerStyle={{ paddingBottom: scale(40) }}>
                  {selectedMaterial && (
                      <View>
                         <View style={styles.viewModalMeta}>
                             <View style={styles.viewModalMetaBadge}>
                                 <Text style={styles.viewModalMetaBadgeText}>{selectedMaterial.targetClass || 'All Classes'}</Text>
                             </View>
                             <View style={[styles.viewModalMetaBadge, { backgroundColor: getSubjectColor(selectedMaterial.subject) + '20' }]}>
                                 <Text style={[styles.viewModalMetaBadgeText, { color: getSubjectColor(selectedMaterial.subject) }]}>{selectedMaterial.subject || 'General'}</Text>
                             </View>
                         </View>
                         <View style={styles.richTextContainer}>
                             {renderRichText(selectedMaterial.content || selectedMaterial.message || 'No description available for this material.', theme, isDark)}
                         </View>
                      </View>
                  )}
               </ScrollView>
            </SafeAreaView>
         </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerBackground: {
    backgroundColor: '#1e3a8a', height: scale(170),
    borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20),
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(12), paddingTop: scale(4) },
  headerTitle: { color: '#fff', fontSize: scale(25), fontWeight: '800' },
  notifBadge: { position: 'absolute', top: scale(6), right: scale(6), backgroundColor: '#ef4444', width: scale(14), height: scale(14), borderRadius: scale(7), justifyContent: 'center', alignItems: 'center' },
  notifBadgeText: { color: '#fff', fontSize: scale(8), fontWeight: 'bold' },
  headerSubtitleWrapper: { alignItems: 'center', marginTop: scale(4) },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: scale(10), lineHeight: scale(14) },
  watermark: { position: 'absolute', right: -scale(20), bottom: -scale(20), opacity: 0.8 },
  
  listContent: { paddingTop: scale(20), paddingBottom: scale(100), paddingHorizontal: scale(8) },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(8) },
  statCard: { backgroundColor: '#fff', borderRadius: scale(8), padding: scale(6), width: '32%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIconWrapper: { width: scale(28), height: scale(24), borderRadius: scale(6), justifyContent: 'center', alignItems: 'center', marginBottom: scale(2) },
  statValue: { fontSize: scale(12), fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: scale(8), color: '#64748b', marginTop: scale(1) },
  
  card: { backgroundColor: '#fff', borderRadius: scale(10), padding: scale(10), marginBottom: scale(8), flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: scale(8), paddingHorizontal: scale(10), height: scale(38), marginBottom: scale(8), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  searchInput: { flex: 1, fontSize: scale(12), color: '#0f172a' },
  
  dropdownsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(8) },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: scale(6), paddingVertical: scale(6), borderRadius: scale(6), borderWidth: 1, borderColor: '#e2e8f0' },
  dropdownLabel: { fontSize: scale(11), color: '#475569', marginRight: scale(4), fontWeight: '500' },
  
  chipsScroll: { marginBottom: scale(20) },
  chipsContainer: { flexDirection: 'row', gap: scale(8), paddingRight: scale(16) },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(8), borderRadius: scale(8), borderWidth: 1 },
  chipText: { fontSize: scale(12), fontWeight: '600' },
  
  cardLeft: { marginRight: scale(12) },
  docIconWrapper: { width: scale(44), height: scale(48), borderRadius: scale(8), borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  typeBadge: { position: 'absolute', bottom: -scale(6), paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(4) },
  typeBadgeText: { color: '#fff', fontSize: scale(8), fontWeight: 'bold' },
  cardCenter: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: scale(13), fontWeight: '700', color: '#0f172a', marginBottom: scale(4) },
  cardSubtitle: { fontSize: scale(10), color: '#64748b', marginBottom: scale(8) },
  blueLabel: { color: '#1d4ed8', fontWeight: '600' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: scale(9), color: '#94a3b8', marginLeft: scale(4) },
  cardRight: { justifyContent: 'space-between', alignItems: 'flex-end', marginLeft: scale(8) },
  btnViewDownload: { paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(6), backgroundColor: '#1d4ed8' },
  btnViewDownloadText: { color: '#fff', fontSize: scale(10), fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: scale(12), padding: scale(16), maxHeight: '80%' },
  modalTitle: { fontSize: scale(16), fontWeight: 'bold', marginBottom: scale(12), color: '#1e293b' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: scale(12), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalOptionText: { fontSize: scale(14), fontWeight: '500' },
  colorDot: { width: scale(10), height: scale(10), borderRadius: scale(5), marginRight: scale(8) },
  
  viewModalContainer: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  viewModalSafeArea: { backgroundColor: '#fff', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), height: height * 0.85 },
  viewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(20), paddingVertical: scale(16), borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  viewModalHeaderTitle: { fontSize: scale(16), fontWeight: '700', color: '#0f172a', flex: 1, marginRight: scale(12) },
  closeBtn: { padding: scale(4), backgroundColor: '#f1f5f9', borderRadius: scale(20) },
  viewModalBody: { flex: 1, padding: scale(20) },
  viewModalMeta: { flexDirection: 'row', gap: scale(8), marginBottom: scale(16) },
  viewModalMetaBadge: { paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(6), backgroundColor: '#e0e7ff' },
  viewModalMetaBadgeText: { fontSize: scale(11), fontWeight: '600', color: '#4338ca' },
  richTextContainer: { backgroundColor: '#f8fafc', padding: scale(16), borderRadius: scale(12), borderWidth: 1, borderColor: '#f1f5f9' }
});
