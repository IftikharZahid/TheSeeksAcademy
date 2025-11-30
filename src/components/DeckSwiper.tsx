import React, { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated, PanResponder } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const SWIPE_THRESHOLD = 120;

interface Course {
  id: string;
  name: string;
  teacher: string;
  image: string;
}

interface DeckSwiperProps {
  data: Course[];
}

export const DeckSwiper: React.FC<DeckSwiperProps> = ({ data }) => {
  const { theme, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > SWIPE_THRESHOLD) {
          // Swipe away
          const direction = gesture.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH;
          Animated.timing(position, {
            toValue: { x: direction, y: gesture.dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            // Move to next card
            setCurrentIndex((prevIndex) => (prevIndex + 1) % data.length);
            position.setValue({ x: 0, y: 0 });
          });
        } else {
          // Snap back
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No courses available</Text>
      </View>
    );
  }

  const currentCard = data[currentIndex];
  const nextCard = data[(currentIndex + 1) % data.length];

  return (
    <View style={styles.container}>
      {/* Next card (background) */}
      {nextCard && (
        <View style={[styles.card, styles.nextCard, { backgroundColor: theme.card }]}>
          <Image source={{ uri: nextCard.image }} style={styles.cardImage} />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{nextCard.name}</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{nextCard.teacher}</Text>
          </View>
        </View>
      )}

      {/* Current card (foreground) */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          { backgroundColor: theme.card },
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          },
        ]}
      >
        <Image source={{ uri: currentCard.image }} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{currentCard.name}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{currentCard.teacher}</Text>
        </View>

        {/* Swipe indicators */}
        <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
          <Text style={styles.likeLabelText}>LIKE</Text>
        </Animated.View>

        <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
          <Text style={styles.nopeLabelText}>NOPE</Text>
        </Animated.View>
      </Animated.View>

      {/* Card counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {data.length}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  emptyContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: 300,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  nextCard: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  cardImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  likeLabel: {
    position: 'absolute',
    top: 30,
    right: 30,
    borderWidth: 4,
    borderColor: '#22c55e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: '15deg' }],
  },
  likeLabelText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#22c55e',
  },
  nopeLabel: {
    position: 'absolute',
    top: 30,
    left: 30,
    borderWidth: 4,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: '-15deg' }],
  },
  nopeLabelText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ef4444',
  },
  counterContainer: {
    position: 'absolute',
    top: 30,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
