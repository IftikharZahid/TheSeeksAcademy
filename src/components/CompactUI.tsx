import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { scale } from '../utils/responsive';

export const CompactCard = ({ icon, label, value, color, width = '50%', copyable = false, onCopy, editable = false, onEdit }: any) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.gridCol, { width }]}>
      <TouchableOpacity 
        activeOpacity={copyable || editable ? 0.65 : 1}
        onPress={editable ? onEdit : (copyable ? onCopy : undefined)}
        style={[styles.gridInner, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={styles.gridHeader}>
          <View style={[styles.gridIconWrap, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={scale(11)} color={color} />
          </View>
          <Text style={[styles.gridLabel, { color: theme.textSecondary }]} numberOfLines={1}>{label}</Text>
        </View>
        <Text style={[styles.gridValue, { color: theme.text }]} numberOfLines={1}>{value || '—'}</Text>
        {copyable && !editable && (
          <View style={[styles.copyBadge, { backgroundColor: color + '16' }]}>
            <Ionicons name="copy-outline" size={scale(9)} color={color} />
          </View>
        )}
        {editable && (
          <View style={[styles.copyBadge, { backgroundColor: color + '16' }]}>
            <Ionicons name="pencil-outline" size={scale(9)} color={color} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const MenuRow = ({ icon, label, subtitle, color, onPress, isLast = false, value, copyable = false, onCopy }: any) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity 
      style={[
        styles.menuRow, 
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }
      ]} 
      onPress={copyable ? onCopy : onPress} 
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={scale(14)} color={color} />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
        {!!subtitle && <Text style={[styles.menuSub, { color: theme.textSecondary }]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {value ? (
        <Text style={[styles.menuValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
      ) : null}
      {!value && !copyable && onPress ? (
        <Ionicons name="chevron-forward" size={scale(14)} color={theme.textSecondary} />
      ) : null}
      {copyable ? (
        <Ionicons name="copy-outline" size={scale(12)} color={theme.textSecondary} style={{marginLeft: scale(8)}} />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCol: {
    paddingHorizontal: scale(4),
    paddingBottom: scale(8),
  },
  gridInner: {
    borderRadius: scale(12),
    borderWidth: 1,
    padding: scale(10),
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  gridIconWrap: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(6),
  },
  gridLabel: {
    fontSize: scale(9),
    fontWeight: '600',
    letterSpacing: 0.4,
    flex: 1,
  },
  gridValue: {
    fontSize: scale(12),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  copyBadge: {
    position: 'absolute',
    top: scale(10),
    right: scale(10),
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
  },
  menuIconWrap: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  menuTextContent: { flex: 1, justifyContent: 'center' },
  menuLabel: { fontSize: scale(12), fontWeight: '600', letterSpacing: -0.1 },
  menuSub: { fontSize: scale(9.5), marginTop: scale(1) },
  menuValue: { fontSize: scale(12), fontWeight: '600', letterSpacing: -0.2, marginLeft: scale(8), flex: 1, textAlign: 'right' },
});
