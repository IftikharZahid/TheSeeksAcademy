import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Dimensions, Animated, TextInput
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { scale } from '../../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../store/hooks';
import type { Notice } from '../../store/slices/notificationsSlice';

const { width } = Dimensions.get('window');

interface CategoryCardProps {
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  onPress: () => void;
  count?: number;
}

// Shimmer skeleton card shown while Firebase data loads
const SkeletonCard: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });
  const bg = isDark ? 'rgba(51,65,85,0.6)' : 'rgba(226,232,240,0.9)';
  const shimBg = isDark ? 'rgba(71,85,105,0.7)' : 'rgba(241,245,249,0.95)';

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(30,41,59,0.9)' : '#fff',
          borderColor: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)',
          opacity,
        },
      ]}
    >
      <View style={[styles.cardIconWrap, { backgroundColor: bg }]} />
      <View style={styles.cardContent}>
        <View style={{ width: '85%', height: scale(13), borderRadius: 6, backgroundColor: bg, marginBottom: scale(6) }} />
        <View style={{ width: '60%', height: scale(9), borderRadius: 5, backgroundColor: shimBg }} />
      </View>
    </Animated.View>
  );
};

// Empty state when Firebase returns no categories
const EmptyState: React.FC<{ theme: any }> = ({ theme }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: scale(60), paddingHorizontal: scale(24) }}>
    <View style={{ width: scale(72), height: scale(72), borderRadius: scale(20), backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', marginBottom: scale(18), shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}>
      <Ionicons name="library-outline" size={scale(34)} color="rgba(255,255,255,0.7)" />
    </View>
    <Text style={{ fontSize: scale(17), fontWeight: '700', color: theme.text, marginBottom: scale(8), textAlign: 'center' }}>No Sections Yet</Text>
    <Text style={{ fontSize: scale(13), color: theme.textSecondary, textAlign: 'center', lineHeight: scale(19) }}>
      The admin has not created any e-Library sections yet. Check back soon!
    </Text>
  </View>
);

export const LibraryScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const notices = useAppSelector(s => s.notifications?.notices) || [];
  const reduxGalleries = useAppSelector((s: any) => s.videos?.galleries) || [];

  const [localCategories, setLocalCategories] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      import('../../api/firebaseConfig').then(({ db }) => {
        const unsub = onSnapshot(doc(db, 'appSettings', 'libraryCategories'), (docSnap) => {
          if (docSnap.exists() && Array.isArray(docSnap.data().list) && docSnap.data().list.length > 0) {
            const list = docSnap.data().list.map((item: any) => {
              if (typeof item === 'string') return { name: item, icon: 'folder' };
              return item;
            });
            setLocalCategories([{ name: 'All', icon: 'layers' }, ...list]);
          } else {
            setLocalCategories([]);
          }
          setIsLoading(false);
        });
        return () => unsub();
      });
    });
  }, []);

  const [isSearching, setIsSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const dynamicCategories = localCategories.filter((cat: any) => {
    const catName = cat.name || cat;
    if (catName === 'All') return false;
    if (catName === 'Video Lectures' || catName === 'Videos') return false;
    if (searchQuery.trim().length > 0) {
      return catName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const renderCard = ({ title, subtitle, icon, color, onPress, count }: CategoryCardProps) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, {
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : '#fff',
        borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(0,0,0,0.04)',
      }]}
    >
      <View style={[styles.cardIconWrap, { backgroundColor: color }]}>
        <Ionicons name={icon} size={scale(22)} color="#fff" />
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{title}</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
      </View>

      {count !== undefined && count > 0 && (
        <View style={{
          position: 'absolute',
          top: 0,
          right: 0,
          backgroundColor: color,
          borderBottomLeftRadius: scale(10),
          borderTopRightRadius: scale(15),
          paddingHorizontal: scale(7),
          paddingVertical: scale(3),
        }}>
          <Text style={{ fontSize: scale(9), fontWeight: 'bold', color: '#fff' }}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const palette = ['#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#eab308', '#ec4899', '#6366f1', '#f43f5e', '#0ea5e9', '#22c55e'];

  return (
    <ScreenContainer useBottomInset={false} useTopInset={false} statusBarColor={theme.primary}>
      {/* Custom Library Header */}
      <View style={[styles.header, { borderBottomLeftRadius: scale(24), borderBottomRightRadius: scale(24), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8, zIndex: 10, borderBottomWidth: 0, backgroundColor: theme.primary, borderBottomColor: theme.primary, paddingTop: Math.max(insets.top, 10) + scale(10) }]}>
        {!isSearching ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TouchableOpacity
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    const routes = navigation.getState()?.routeNames || [];
                    if (routes.includes('Main')) {
                      navigation.navigate('Main' as any);
                    } else if (routes.includes('Home')) {
                      navigation.navigate('Home' as any);
                    }
                  }
                }}
                style={styles.headerBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={scale(22)} color="#ffffff" />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="library" size={scale(26)} color="#ffffff" style={{ marginRight: scale(8) }} />
                <View>
                  <Text style={[styles.headerTitle, { color: '#ffffff' }]}>e-Library</Text>
                  <Text style={[styles.headerSub, { color: 'rgba(255,255,255,0.7)' }]}>Educational resources & materials</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.searchBtn} onPress={() => setIsSearching(true)}>
              <Ionicons name="search" size={scale(18)} color="#ffffff" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: scale(10), paddingHorizontal: scale(10) }}>
            <Ionicons name="search" size={scale(18)} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={{ flex: 1, paddingVertical: scale(8), paddingHorizontal: scale(8), color: '#ffffff', fontSize: scale(14) }}
              placeholder="Search sections..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }} style={{ padding: scale(4) }}>
              <Ionicons name="close-circle" size={scale(18)} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + scale(20), flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <LinearGradient
          colors={isDark ? ['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.05)'] : ['#f4f6fc', '#f8f9ff']}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { color: isDark ? '#fff' : '#1e293b' }]}>
              All your learning{'\n'}resources in <Text style={{ color: '#6366f1' }}>one place</Text>
            </Text>
            <Text style={[styles.heroSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Explore, learn and grow every day.
            </Text>
          </View>
          <View style={styles.heroIllustration}>
            <Ionicons name="library" size={scale(55)} color="#ffffff" style={{ position: 'absolute', right: scale(10), bottom: scale(5) }} />
            <Ionicons name="book" size={scale(35)} color="#ffffff" style={{ position: 'absolute', right: scale(35), bottom: scale(15) }} />
            <Ionicons name="school" size={scale(25)} color="#6366f1" style={{ position: 'absolute', right: scale(15), top: scale(10) }} />
          </View>
        </LinearGradient>

        {isLoading ? (
          // Skeleton shimmer while loading
          <View style={styles.gridContainer}>
            {[0, 1, 2, 3].map(i => <SkeletonCard key={i} isDark={isDark} />)}
          </View>

        ) : dynamicCategories.length === 0 ? (
          <EmptyState theme={theme} />

        ) : (
          <View style={styles.gridContainer}>
            {dynamicCategories.map((catObj: any, index: number) => {
              const catName = catObj.name || catObj;
              const customIcon = catObj.icon;
              const customSubtitle = catObj.subtitle;

              const isVideo = catName === 'Video Lectures' || catName === 'Videos';
              const isDoc = catName === 'Documents';

              const getCategoryStyle = (name: string) => {
                if (name === 'Video Lectures' || name === 'Videos') return { color: '#ff4d6d', icon: 'videocam' };
                if (name === 'Books') return { color: '#22c55e', icon: 'book' };
                if (name === 'Syllabus') return { color: '#f97316', icon: 'bookmark' };
                if (name === 'Past Papers') return { color: '#0ea5e9', icon: 'clipboard' };
                if (name === 'Quick Notes') return { color: '#eab308', icon: 'create' };
                if (name === 'Documents') return { color: '#3b82f6', icon: 'document-text' };
                if (name === 'Solved Papers') return { color: '#8b5cf6', icon: 'checkmark-circle' };
                if (name === 'Audio Lectures') return { color: '#f43f5e', icon: 'headset' };
                if (name === 'Important Lectures') return { color: '#06b6d4', icon: 'bulb' };
                return null;
              };

              const defaultStyle = getCategoryStyle(catName);
              const cardColor = defaultStyle ? defaultStyle.color : palette[index % palette.length];
              const cardIcon = customIcon && customIcon !== 'folder' ? customIcon : (defaultStyle ? defaultStyle.icon : 'folder');
              const cardSubtitle = customSubtitle
                ? customSubtitle
                : isVideo ? 'All video lectures'
                : isDoc ? 'PDFs, notes & PPTs.'
                : catName === 'Books' ? 'Browse books'
                : catName === 'Syllabus' ? 'Browse syllabus'
                : catName === 'Past Papers' ? 'Browse past papers'
                : catName === 'Quick Notes' ? 'Browse quick notes'
                : catName === 'Solved Papers' ? 'All boards solved papers'
                : catName === 'Audio Lectures' ? 'Browse audio lectures'
                : catName === 'Important Lectures' ? 'Urgent based lectures'
                : `Browse ${catName.toLowerCase()}`;

              return (
                <React.Fragment key={catName}>
                  {renderCard({
                    title: catName,
                    subtitle: cardSubtitle,
                    icon: cardIcon,
                    color: cardColor,
                    onPress: () => isVideo
                      ? navigation.navigate('VideoGallery', { screen: 'VideoGalleryScreen' })
                      : navigation.navigate('Home', { screen: 'DocumentsScreen', params: { category: catName } }),
                    count: isVideo
                      ? reduxGalleries.length
                      : notices.filter((n: any) => n.category === catName).length,
                  })}
                </React.Fragment>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
  },
  headerBtn: { marginRight: scale(12) },
  headerTitle: { fontSize: scale(20), fontWeight: '800' },
  headerSub: { fontSize: scale(12), marginTop: scale(1) },
  searchBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBanner: {
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: scale(22),
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  heroContent: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: scale(16),
    fontWeight: '800',
    lineHeight: scale(22),
    marginBottom: scale(6),
  },
  heroSubtitle: {
    fontSize: scale(12),
  },
  heroIllustration: {
    width: scale(90),
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  content: { padding: scale(16) },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
  },
  cardIconWrap: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  cardContent: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: scale(12.5), fontWeight: '700', marginBottom: scale(2) },
  cardSubtitle: { fontSize: scale(9.5) },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: scale(2),
  },
  badge: {
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(8),
    marginRight: scale(4),
  },
  badgeText: { fontSize: scale(10), fontWeight: '700' },
});
