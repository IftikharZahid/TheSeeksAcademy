import React from 'react';
import { View, StyleSheet, StatusBar, RefreshControl } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { AppHeader } from './AppHeader';

interface ScreenContainerProps {
  children: React.ReactNode;
  
  // Header props (if provided, header will be rendered)
  headerTitle?: string;
  headerSubtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;

  // Layout props
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  paddingHorizontal?: number;
  useBottomInset?: boolean;
  useTopInset?: boolean;
  
  // Advanced overrides
  statusBarColor?: string;
  statusBarStyle?: 'light-content' | 'dark-content';
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  headerTitle,
  headerSubtitle,
  showBack = true,
  onBack,
  rightAction,
  scroll = false,
  refreshing = false,
  onRefresh,
  paddingHorizontal = 0,
  useBottomInset = true,
  useTopInset = true,
  statusBarColor,
  statusBarStyle,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Android: translucent status bar for edge-to-edge drawing
  const finalStatusBarColor = statusBarColor || 'transparent';
  const finalStatusBarStyle = statusBarStyle || 'light-content';

  const content = (
    <View style={[styles.content, { paddingHorizontal }]}>
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: finalStatusBarColor === 'transparent' ? theme.background : finalStatusBarColor }}>
      <StatusBar 
        barStyle={finalStatusBarStyle} 
        backgroundColor={finalStatusBarColor} 
        translucent={true} 
      />
      <View style={[
        styles.container, 
        { 
          backgroundColor: theme.background,
          paddingTop: (!headerTitle && useTopInset) ? Math.max(insets.top, 16) : 0,
          paddingBottom: useBottomInset ? Math.max(insets.bottom, 8) : 0
        }
      ]}>
        {headerTitle && (
          <AppHeader
            title={headerTitle}
            subtitle={headerSubtitle}
            showBack={showBack}
            onBack={onBack}
            rightAction={rightAction}
          />
        )}

        {scroll ? (
          <KeyboardAwareScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            enableOnAndroid={true}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={20}
            enableResetScrollToCoords={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  tintColor={theme.primary} 
                />
              ) : undefined
            }
          >
            {content}
          </KeyboardAwareScrollView>
        ) : (
          content
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
