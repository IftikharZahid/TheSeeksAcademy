const fs = require('fs');

const file = 'c:/p/TheSeeks-Students/src/screens/Academics/TimetableScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Animated to imports if missing
if (!content.includes('Animated')) {
  content = content.replace(
    /import \{ View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, StatusBar \} from 'react-native';/,
    "import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, StatusBar, Animated } from 'react-native';"
  );
}

// 2. Add useRef to react imports if missing
if (!content.includes('useRef')) {
  content = content.replace(
    /import React, \{ useState, useCallback, useEffect \} from 'react';/,
    "import React, { useState, useCallback, useEffect, useRef } from 'react';"
  );
}

// 3. Define AnimatedLectureItem before TimetableScreen
const animatedComponent = `
const AnimatedLectureItem = ({ classItem, index, isLast, theme, selectedDay }: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(50);
    
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 40,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedDay, classItem.id]);

  return (
    <Animated.View style={[styles.timelineRow, { opacity, transform: [{ translateY }] }]}>
      {/* Time Column */}
      <View style={styles.timeColumn}>
        <Text style={[styles.timeText, { color: theme.textSecondary }]}>
          {formatTo12Hour(classItem.time)}
        </Text>
      </View>

      {/* Timeline Center */}
      <View style={styles.timelineCenter}>
        <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: 'rgba(0,0,0,0.08)' }]} />}
      </View>

      {/* Content Card */}
      <View style={[styles.contentCard, { backgroundColor: theme.card, borderLeftColor: theme.primary, shadowColor: '#000' }]}>
        
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.subjectText, { color: theme.text }]} numberOfLines={1}>
            {classItem.subject}
          </Text>
          <View style={[styles.lectureBadge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.lectureBadgeText, { color: theme.primary }]}>
              Lec {classItem.lectureNo || (index + 1)}
            </Text>
          </View>
        </View>

        {classItem.combinedDetails ? (
          classItem.combinedDetails.map((detail: any, idx: number) => (
            <View key={idx} style={[styles.cardFooterRow, { marginTop: idx > 0 ? scale(4) : scale(2) }]}>
              <View style={[styles.detailItem, { flexShrink: 1, marginRight: scale(4) }]}>
                <Ionicons name="person-circle-outline" size={scale(14)} color={theme.textSecondary} />
                <Text style={[styles.detailsText, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                  {detail.instructor}
                </Text>
              </View>

              <View style={[styles.detailItem, { flexShrink: 0, maxWidth: '50%' }]}>
                <Text style={[styles.detailsText, { color: theme.textSecondary, fontWeight: '600' }]}>Room:</Text>
                <Text style={[styles.detailsText, { color: theme.textSecondary, marginLeft: 2 }]} ellipsizeMode="tail" numberOfLines={1}>
                  {detail.room}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.cardFooterRow}>
            <View style={[styles.detailItem, { flexShrink: 1, marginRight: scale(4) }]}>
              <Ionicons name="person-circle-outline" size={scale(14)} color={theme.textSecondary} />
              <Text style={[styles.detailsText, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                {classItem.instructor}
              </Text>
            </View>

            <View style={[styles.detailItem, { flexShrink: 0, maxWidth: '50%' }]}>
              <Text style={[styles.detailsText, { color: theme.textSecondary, fontWeight: '600' }]}>Room:</Text>
              <Text style={[styles.detailsText, { color: theme.textSecondary, marginLeft: 2 }]} ellipsizeMode="tail" numberOfLines={1}>
                {classItem.room}
              </Text>
            </View>
          </View>
        )}
        
      </View>
    </Animated.View>
  );
};

export const TimetableScreen: React.FC = () => {`;

content = content.replace("export const TimetableScreen: React.FC = () => {", animatedComponent);

// 4. Replace the map function body
const oldMapRegex = /<View key=\{classItem\.id \|\| index\} style=\{styles\.timelineRow\}>[\s\S]*?<\/View>\s*<\/View>\s*\);/m;
const newMapBody = `<AnimatedLectureItem 
                      key={classItem.id || index}
                      classItem={classItem}
                      index={index}
                      isLast={isLast}
                      theme={theme}
                      selectedDay={activeDay}
                    />
                  );`;

content = content.replace(oldMapRegex, newMapBody);

fs.writeFileSync(file, content);
console.log('Added AnimatedLectureItem to TimetableScreen');
