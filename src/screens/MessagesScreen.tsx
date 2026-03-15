/**
 * MessagesScreen.tsx
 *
 * Group chat screen for The Seeks Academy.
 *
 * Architecture:
 *  - INTERFACES & CONSTANTS
 *  - HELPER FUNCTIONS
 *  - SUB-COMPONENTS  (ChatHeader, MessageBubble, InputBar,
 *                     EmojiPickerSheet, MessageActionSheet,
 *                     DeleteConfirmSheet, SettingsMenuModal)
 *  - MAIN COMPONENT  (MessagesScreen)
 *  - STYLES
 *
 * Backend:
 *  - Firestore `group_messages` collection (send / edit / delete)
 *  - Redux `messagesSlice` — global listener started in App.tsx;
 *    this screen reads from store, never opens its own listener.
 *  - Redux `authSlice` — user uid, name, photo, class, role
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Keyboard,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateLastReadTimestamp } from '../store/slices/messagesSlice';
import type { SerializableMessage } from '../store/slices/messagesSlice';

import { db } from '../api/firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  query,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────
// INTERFACES & CONSTANTS
// ─────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FontSizeOption {
  label: string;
  value: number;
}

const FONT_SIZES: FontSizeOption[] = [
  { label: 'S', value: 12 },
  { label: 'M', value: 14 },
  { label: 'L', value: 16 },
  { label: 'XL', value: 18 },
];

interface EmojiCategory {
  id: string;
  icon: string;
  data: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    icon: 'happy-outline',
    data: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇',
      '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
      '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒',
      '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢',
      '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
      '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄',
      '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴',
    ],
  },
  {
    id: 'nature',
    icon: 'paw-outline',
    data: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸',
      '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉',
      '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟',
      '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠',
      '🐟', '🐬', '🐳', '🐋', '🦈', '🦭', '🐊', '🐅', '🐆', '🦍', '🐫', '🐘',
    ],
  },
  {
    id: 'food',
    icon: 'fast-food-outline',
    data: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑',
      '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽',
      '🥕', '🧄', '🧅', '🥔', '🥐', '🥯', '🍞', '🥖', '🧀', '🥚', '🍳', '🥞',
      '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🌮', '🌯',
      '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍙', '🍚', '🍘', '🍥', '🧁',
      '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕️', '🍵', '🧋',
    ],
  },
  {
    id: 'activity',
    icon: 'football-outline',
    data: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸',
      '🏒', '🏑', '🥅', '⛳', '🏹', '🎣', '🥊', '🥋', '🎽', '⛷', '🏂', '🏋',
      '🤺', '🧘', '🏄', '🏊', '🏇', '🚵', '🎽', '🏅', '🥇', '🥈', '🥉', '🏆',
      '🎫', '🎟', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷',
      '🎺', '🎸', '🎻', '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩',
    ],
  },
  {
    id: 'objects',
    icon: 'bulb-outline',
    data: [
      '⌚', '📱', '💻', '⌨', '🖥', '🖨', '🖱', '🕹', '💽', '💾', '💿', '📀',
      '📼', '📷', '📸', '📹', '🎥', '📽', '📞', '☎', '📟', '📠', '📺', '📻',
      '🧭', '⏱', '⏲', '⏰', '⌛', '⏳', '💳', '💎', '⚖', '🔨', '⚒', '⛏',
      '⚙', '🔫', '💣', '🛡', '⚗', '🔭', '🔬', '💊', '💉', '🧹', '🧺', '🧻',
      '🚽', '🚰', '🚿', '🧽', '🪑', '🛋', '🛏', '🧸', '🎁', '🎈', '🎊', '🎉',
      '✉', '📩', '📨', '📧', '💌', '📦', '📜', '📃', '📄', '📊', '📈', '📉',
      '📋', '📁', '📂', '🗞', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙',
      '📚', '📖', '🔖', '📎', '📐', '📏', '📝', '✏', '🔍', '🔎', '🔒', '🔓',
    ],
  },
];

// ─────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────

/** Format a millisecond timestamp as HH:MM */
function formatTime(ms: number | null): string {
  if (!ms) return '';
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Format a millisecond timestamp as a readable date label */
function formatDateLabel(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Get day key string (YYYY-MM-DD) for grouping messages by date */
function getDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Get initials (max 2 chars) from a name */
function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

/** Deterministic hue from name for initials avatars */
function getNameHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ((hash % 360) + 360) % 360;
}

// ─────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────

// ── ChatHeader ──────────────────────────────────────────

interface ChatHeaderProps {
  messageCount: number;
  onBack: () => void;
  onMenu: () => void;
  primaryColor: string;
  primaryDark: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = memo(
  ({ messageCount, onBack, onMenu, primaryColor, primaryDark }) => (
    <View style={[headerStyles.header, { backgroundColor: primaryColor }]}>
      <TouchableOpacity onPress={onBack} style={headerStyles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={headerStyles.center}>
        <View style={[headerStyles.groupIcon, { backgroundColor: primaryDark }]}>
          <Ionicons name="chatbubbles" size={15} color="#fff" />
        </View>
        <View style={headerStyles.titleBox}>
          <Text style={headerStyles.title} numberOfLines={1}>The Seeks Academy</Text>
          <Text style={headerStyles.subtitle}>{messageCount} messages</Text>
        </View>
      </View>

      <TouchableOpacity onPress={onMenu} style={headerStyles.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  )
);

const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  backBtn: { padding: 4, marginRight: 4 },
  center: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  groupIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  titleBox: { marginLeft: 10, flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 1 },
  menuBtn: { padding: 8 },
});

// ── MessageBubble ────────────────────────────────────────

interface MessageBubbleProps {
  msg: SerializableMessage;
  isMine: boolean;
  fontSize: number;
  theme: any;
  onLongPress: (msg: SerializableMessage) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = memo(
  ({ msg, isMine, fontSize, theme, onLongPress }) => {
    const hasPhoto = !!msg.senderPhoto;
    const hue = getNameHue(msg.senderName);

    return (
      <View style={[bubbleStyles.row, isMine ? bubbleStyles.rowRight : bubbleStyles.rowLeft]}>
        {/* Avatar — other users only */}
        {!isMine && (
          hasPhoto ? (
            <Image source={{ uri: msg.senderPhoto }} style={bubbleStyles.avatar} />
          ) : (
            <View style={[bubbleStyles.avatar, bubbleStyles.initialsAvatar, { backgroundColor: `hsl(${hue},65%,55%)` }]}>
              <Text style={bubbleStyles.initialsText}>{getInitials(msg.senderName)}</Text>
            </View>
          )
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => isMine && onLongPress(msg)}
          delayLongPress={350}
          style={[
            bubbleStyles.bubble,
            isMine ? bubbleStyles.bubbleSent : bubbleStyles.bubbleReceived,
            { backgroundColor: isMine ? theme.primary : theme.card },
          ]}
        >
          {/* Sender name — other users only */}
          {!isMine && (
            <Text style={[bubbleStyles.senderName, { color: theme.accent }]}>
              {msg.senderName}{msg.senderClass ? ` (${msg.senderClass})` : ''}
            </Text>
          )}

          <Text style={[bubbleStyles.msgText, { color: isMine ? '#fff' : theme.text, fontSize }]}>
            {msg.text}
          </Text>

          <View style={bubbleStyles.meta}>
            <Text style={[bubbleStyles.time, { color: isMine ? 'rgba(255,255,255,0.65)' : theme.textTertiary }]}>
              {formatTime(msg.timestampMs)}
            </Text>
            {isMine && (
              <Ionicons name="checkmark-done" size={11} color="rgba(255,255,255,0.75)" style={{ marginLeft: 3 }} />
            )}
          </View>
        </TouchableOpacity>

        {/* Avatar — own messages only */}
        {isMine && (
          hasPhoto ? (
            <Image source={{ uri: msg.senderPhoto }} style={[bubbleStyles.avatar, { marginLeft: 6, marginRight: 0 }]} />
          ) : (
            <View style={[bubbleStyles.avatar, bubbleStyles.initialsAvatar, { backgroundColor: `hsl(${hue},65%,55%)`, marginLeft: 6, marginRight: 0 }]}>
              <Text style={bubbleStyles.initialsText}>{getInitials(msg.senderName)}</Text>
            </View>
          )
        )}
      </View>
    );
  }
);

const bubbleStyles = StyleSheet.create({
  row: { marginBottom: 3, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8 },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 6 },
  initialsAvatar: { justifyContent: 'center', alignItems: 'center' },
  initialsText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  bubble: {
    maxWidth: SCREEN_WIDTH * 0.72,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    minHeight: 32,
  },
  bubbleSent: { borderBottomRightRadius: 3, marginLeft: 32 },
  bubbleReceived: { borderBottomLeftRadius: 3, marginRight: 32 },
  senderName: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  msgText: { lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3 },
  time: { fontSize: 10 },
});

// ── DateSeparator ────────────────────────────────────────

interface DateSeparatorProps {
  label: string;
  cardColor: string;
  textColor: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = memo(({ label, cardColor, textColor }) => (
  <View style={[sepStyles.container, { backgroundColor: cardColor }]}>
    <Text style={[sepStyles.text, { color: textColor }]}>{label}</Text>
  </View>
));

const sepStyles = StyleSheet.create({
  container: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, marginVertical: 10 },
  text: { fontSize: 11, fontWeight: '600' },
});

// ── InputBar ─────────────────────────────────────────────

interface InputBarProps {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  onEmojiPress: () => void;
  onCancelEdit: () => void;
  isEditing: boolean;
  isSending: boolean;
  isDisabled: boolean;
  theme: any;
}

const InputBar: React.FC<InputBarProps> = memo(
  ({
    value, onChangeText, onSend, onEmojiPress, onCancelEdit,
    isEditing, isSending, isDisabled, theme,
  }) => (
    <View style={[inputStyles.bar, {
      backgroundColor: theme.card,
      borderTopColor: theme.border,
    }]}>
      {/* Emoji button */}
      <TouchableOpacity style={inputStyles.iconBtn} onPress={onEmojiPress}>
        <Ionicons name="happy-outline" size={24} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* Cancel edit */}
      {isEditing && (
        <TouchableOpacity style={inputStyles.iconBtn} onPress={onCancelEdit}>
          <Ionicons name="close-circle" size={24} color={theme.error} />
        </TouchableOpacity>
      )}

      {/* Text input */}
      <View style={[inputStyles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
        <TextInput
          style={[inputStyles.input, { color: theme.text }]}
          placeholder={isEditing ? 'Edit message…' : 'Type a message…'}
          placeholderTextColor={theme.placeholder}
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={4096}
        />
      </View>

      {/* Send / confirm button */}
      <TouchableOpacity
        style={[inputStyles.sendBtn, { backgroundColor: isDisabled ? theme.border : theme.primary }]}
        onPress={onSend}
        disabled={isDisabled || isSending}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name={isEditing ? 'checkmark' : 'send'} size={16} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  )
);

const inputStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    minHeight: 38,
    borderWidth: 1,
    justifyContent: 'center',
  },
  input: { fontSize: 14, lineHeight: 19, paddingVertical: 0, maxHeight: 90 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
});

// ── EmojiPickerSheet ──────────────────────────────────────

interface EmojiPickerSheetProps {
  visible: boolean;
  activeCat: string;
  onCatChange: (id: string) => void;
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  theme: any;
}

const EmojiPickerSheet: React.FC<EmojiPickerSheetProps> = memo(
  ({ visible, activeCat, onCatChange, onEmojiSelect, onClose, theme }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sheetStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[sheetStyles.panel, { backgroundColor: theme.card, height: 340 }]}>
              {/* Category tabs */}
              <View style={[sheetStyles.tabBar, { borderBottomColor: theme.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4 }}>
                  {EMOJI_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[sheetStyles.tab, activeCat === cat.id && { backgroundColor: theme.backgroundTertiary }]}
                      onPress={() => onCatChange(cat.id)}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={22}
                        color={activeCat === cat.id ? theme.primary : theme.textTertiary}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={sheetStyles.closeIcon} onPress={onClose}>
                  <Ionicons name="close-circle" size={24} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Emoji grid */}
              <ScrollView contentContainerStyle={sheetStyles.grid}>
                {EMOJI_CATEGORIES.find(c => c.id === activeCat)?.data.map((emoji, i) => (
                  <TouchableOpacity key={i} style={sheetStyles.emojiBtn} onPress={() => onEmojiSelect(emoji)}>
                    <Text style={sheetStyles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
);

// ── MessageActionSheet ────────────────────────────────────

interface MessageActionSheetProps {
  msg: SerializableMessage | null;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  theme: any;
}

const MessageActionSheet: React.FC<MessageActionSheetProps> = memo(
  ({ msg, onEdit, onDelete, onClose, theme }) => (
    <Modal visible={!!msg} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sheetStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={sheetStyles.sheetContent}>
              <View style={[sheetStyles.group, { backgroundColor: theme.card }]}>
                {/* Header */}
                <View style={[sheetStyles.groupHeader, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[sheetStyles.groupTitle, { color: theme.textSecondary }]}>Message Options</Text>
                    {msg && (
                      <Text style={[sheetStyles.groupSubtitle, { color: theme.textTertiary }]} numberOfLines={1}>
                        {msg.text.length > 40 ? msg.text.slice(0, 40) + '…' : msg.text}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity style={sheetStyles.closePill} onPress={onClose}>
                    <Ionicons name="close-circle" size={24} color={theme.textTertiary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={sheetStyles.actionBtn} onPress={onEdit}>
                  <Text style={[sheetStyles.actionText, { color: theme.primary }]}>Edit Message</Text>
                </TouchableOpacity>

                <View style={[sheetStyles.divider, { backgroundColor: theme.border }]} />

                <TouchableOpacity style={sheetStyles.actionBtn} onPress={onDelete}>
                  <Text style={[sheetStyles.actionText, { color: theme.error }]}>Delete Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
);

// ── DeleteConfirmSheet ────────────────────────────────────

interface DeleteConfirmSheetProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  theme: any;
}

const DeleteConfirmSheet: React.FC<DeleteConfirmSheetProps> = memo(
  ({ visible, onConfirm, onCancel, theme }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={sheetStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={sheetStyles.sheetContent}>
              <View style={[sheetStyles.group, { backgroundColor: theme.card }]}>
                <View style={[sheetStyles.groupHeader, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 30 }}>
                    <Text style={[sheetStyles.groupTitle, { color: theme.textSecondary }]}>Delete Message?</Text>
                    <Text style={[sheetStyles.groupSubtitle, { color: theme.textTertiary, textAlign: 'center' }]}>
                      This cannot be undone.
                    </Text>
                  </View>
                  <TouchableOpacity style={sheetStyles.closePill} onPress={onCancel}>
                    <Ionicons name="close-circle" size={24} color={theme.textTertiary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={sheetStyles.actionBtn} onPress={onConfirm}>
                  <Text style={[sheetStyles.actionText, { color: theme.error, fontWeight: '700' }]}>Delete</Text>
                </TouchableOpacity>

                <View style={[sheetStyles.divider, { backgroundColor: theme.border }]} />

                <TouchableOpacity style={sheetStyles.actionBtn} onPress={onCancel}>
                  <Text style={[sheetStyles.actionText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
);

// ── SettingsMenuModal ─────────────────────────────────────

interface SettingsMenuModalProps {
  visible: boolean;
  isDark: boolean;
  fontSize: number;
  isAdmin: boolean;
  onToggleTheme: () => void;
  onFontSize: (v: number) => void;
  onClearMine: () => void;
  onClearAll: () => void;
  onClose: () => void;
  theme: any;
}

const SettingsMenuModal: React.FC<SettingsMenuModalProps> = memo(
  ({ visible, isDark, fontSize, isAdmin, onToggleTheme, onFontSize, onClearMine, onClearAll, onClose, theme }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={menuStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[menuStyles.container, { backgroundColor: theme.card }]}>
              <Text style={[menuStyles.title, { color: theme.text }]}>Settings</Text>

              {/* Theme toggle */}
              <TouchableOpacity style={menuStyles.row} onPress={() => { onToggleTheme(); onClose(); }}>
                <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.primary} />
                <Text style={[menuStyles.rowText, { color: theme.text }]}>
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </Text>
              </TouchableOpacity>

              {/* Font size */}
              <View style={menuStyles.fontSection}>
                <View style={menuStyles.row}>
                  <Ionicons name="text-outline" size={20} color={theme.primary} />
                  <Text style={[menuStyles.rowText, { color: theme.text }]}>Font Size</Text>
                </View>
                <View style={menuStyles.fontBtns}>
                  {FONT_SIZES.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        menuStyles.fontBtn,
                        { borderColor: theme.border },
                        fontSize === opt.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                      onPress={() => onFontSize(opt.value)}
                    >
                      <Text style={[menuStyles.fontBtnLabel, { color: fontSize === opt.value ? '#fff' : theme.textSecondary }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[menuStyles.divider, { backgroundColor: theme.border }]} />

              {/* Clear my messages */}
              <TouchableOpacity style={menuStyles.row} onPress={() => { onClose(); onClearMine(); }}>
                <Ionicons name="trash-outline" size={20} color={theme.error} />
                <Text style={[menuStyles.rowText, { color: theme.error }]}>Clear My Messages</Text>
              </TouchableOpacity>

              {/* Admin only — clear entire chat */}
              {isAdmin && (
                <TouchableOpacity style={menuStyles.row} onPress={() => { onClose(); onClearAll(); }}>
                  <Ionicons name="alert-circle-outline" size={20} color={theme.error} />
                  <Text style={[menuStyles.rowText, { color: theme.error, fontWeight: '700' }]}>
                    Clear Entire Chat
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[menuStyles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}
                onPress={onClose}
              >
                <Text style={[menuStyles.closeBtnText, { color: theme.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
);

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetContent: { padding: 14, paddingBottom: 34 },
  panel: { borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' },
  group: { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  groupTitle: { fontSize: 13, fontWeight: '600' },
  groupSubtitle: { fontSize: 11, marginTop: 2 },
  closePill: { position: 'absolute', right: 10, top: 10, padding: 4 },
  actionBtn: { paddingVertical: 16, alignItems: 'center' },
  actionText: { fontSize: 17, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, opacity: 0.6 },
  // Emoji picker
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    paddingVertical: 6,
    paddingRight: 6,
  },
  tab: { padding: 8, borderRadius: 8, marginHorizontal: 3 },
  closeIcon: { padding: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, paddingBottom: 30 },
  emojiBtn: { width: '12.5%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 24 },
});

const menuStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { width: SCREEN_WIDTH * 0.82, maxWidth: 340, borderRadius: 18, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  rowText: { fontSize: 15, fontWeight: '500', marginLeft: 12 },
  fontSection: { marginVertical: 4 },
  fontBtns: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, paddingHorizontal: 4 },
  fontBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  fontBtnLabel: { fontSize: 13, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  closeBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────

export const MessagesScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { theme, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Redux state ──────────────────────────────────────
  const storeMessages = useAppSelector((state) => state.messages.list);
  const isLoading = useAppSelector((state) => state.messages.isLoading);
  const user = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.auth.profile);

  const isAdmin =
    profile?.role === 'admin' ||
    user?.email?.toLowerCase() === 'iftikharzahid@outlook.com';

  // ── Local UI state ────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<SerializableMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SerializableMessage | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeCat, setActiveCat] = useState('smileys');
  const [fontSize, setFontSize] = useState(14);
  const [refreshing, setRefreshing] = useState(false);

  const flatRef = useRef<FlatList>(null);

  // ── Scroll to bottom ──────────────────────────────────
  const scrollToBottom = useCallback((animated = true) => {
    flatRef.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    if (storeMessages.length > 0) {
      const timer = setTimeout(() => scrollToBottom(false), 80);
      return () => clearTimeout(timer);
    }
  }, [storeMessages.length, scrollToBottom]);

  // ── Unread tracking ───────────────────────────────────
  const isFocusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      dispatch(updateLastReadTimestamp(Date.now()));
      return () => {
        isFocusedRef.current = false;
        dispatch(updateLastReadTimestamp(Date.now()));
      };
    }, [dispatch])
  );

  useEffect(() => {
    if (isFocusedRef.current && storeMessages.length > 0) {
      dispatch(updateLastReadTimestamp(Date.now()));
    }
  }, [storeMessages.length, dispatch]);

  // ── Keyboard — scroll to bottom when keyboard appears ───
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => scrollToBottom(true), 120);
    });
    return () => showSub.remove();
  }, [scrollToBottom]);

  // ── Refresh (pull-to-refresh — data comes from Redux) ─
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // ── Send / Edit ───────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !user || isSending) return;

    setInputText('');
    setIsSending(true);

    try {
      if (editingId) {
        await updateDoc(doc(db, 'group_messages', editingId), {
          text,
          isEdited: true,
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'group_messages'), {
          text,
          senderId: user.uid,
          senderName: profile?.fullname || user.displayName || 'Anonymous',
          senderPhoto: profile?.image || user.photoURL || null,
          senderClass: profile?.class || '',
          timestamp: serverTimestamp(),
        });
        scrollToBottom(true);
      }
    } catch (err) {
      console.error('Send error:', err);
      setInputText(text); // restore on failure
    } finally {
      setIsSending(false);
    }
  };

  // ── Delete single message ─────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await deleteDoc(doc(db, 'group_messages', id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // ── Clear my messages ─────────────────────────────────
  const handleClearMine = () => {
    Alert.alert(
      'Clear My Messages',
      'Delete all your messages in this chat? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const mine = storeMessages.filter(m => m.senderId === user?.uid);
              await Promise.all(mine.map(m => deleteDoc(doc(db, 'group_messages', m.id))));
            } catch (err) {
              console.error('Clear mine error:', err);
              Alert.alert('Error', 'Failed to clear messages.');
            }
          },
        },
      ]
    );
  };

  // ── Clear entire chat (admin) ──────────────────────────
  const handleClearAll = () => {
    Alert.alert(
      'Clear Entire Chat',
      'Delete ALL messages for everyone? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Chat',
          style: 'destructive',
          onPress: async () => {
            try {
              const snap = await getDocs(query(collection(db, 'group_messages')));
              await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'group_messages', d.id))));
              Alert.alert('Done', 'Chat cleared.');
            } catch (err) {
              console.error('Clear all error:', err);
              Alert.alert('Error', 'Failed to clear chat.');
            }
          },
        },
      ]
    );
  };

  // ── Long-press my message ─────────────────────────────
  const handleLongPress = useCallback((msg: SerializableMessage) => {
    setActionMsg(msg);
  }, []);

  // ── Build FlatList data with day separators ───────────
  type ListItem =
    | { kind: 'separator'; key: string; label: string }
    | { kind: 'message'; key: string; msg: SerializableMessage };

  const listData: ListItem[] = [];
  let lastDayKey = '';

  for (const msg of storeMessages) {
    const ts = msg.timestampMs ?? msg.createdAtMs;
    const dayKey = getDayKey(ts);
    if (dayKey !== lastDayKey) {
      lastDayKey = dayKey;
      listData.push({ kind: 'separator', key: `sep_${dayKey}`, label: formatDateLabel(ts) });
    }
    listData.push({ kind: 'message', key: msg.id, msg });
  }

  // ── Render ────────────────────────────────────────────
  return (
    <SafeAreaView style={[mainStyles.root, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <ChatHeader
        messageCount={storeMessages.length}
        onBack={() => navigation.goBack()}
        onMenu={() => setShowMenu(true)}
        primaryColor={theme.primary}
        primaryDark={theme.primaryDark}
      />

      {/* Modals */}
      <SettingsMenuModal
        visible={showMenu}
        isDark={isDark}
        fontSize={fontSize}
        isAdmin={isAdmin}
        onToggleTheme={toggleTheme}
        onFontSize={setFontSize}
        onClearMine={handleClearMine}
        onClearAll={handleClearAll}
        onClose={() => setShowMenu(false)}
        theme={theme}
      />

      <MessageActionSheet
        msg={actionMsg}
        onEdit={() => {
          const m = actionMsg;
          setActionMsg(null);
          if (m) { setInputText(m.text); setEditingId(m.id); }
        }}
        onDelete={() => {
          const m = actionMsg;
          setActionMsg(null);
          if (m) setDeleteTarget(m);
        }}
        onClose={() => setActionMsg(null)}
        theme={theme}
      />

      <DeleteConfirmSheet
        visible={!!deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        theme={theme}
      />

      <EmojiPickerSheet
        visible={showEmoji}
        activeCat={activeCat}
        onCatChange={setActiveCat}
        onEmojiSelect={emoji => setInputText(prev => prev + emoji)}
        onClose={() => setShowEmoji(false)}
        theme={theme}
      />

      {/* Chat area
       *  iOS    : behavior="padding" — adds paddingBottom equal to keyboard height
       *  Android: behavior="height" — reduces KAV height so InputBar stays above keyboard.
       *           Also keeps softwareKeyboardLayoutMode="resize" in app.json as a first
       *           pass; when resize works, KAV sees zero overlap and does nothing extra.
       *           When resize fails (some devices), KAV acts as the safety net.
       */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          style={[mainStyles.list, { backgroundColor: theme.background }]}
          contentContainerStyle={mainStyles.listContent}
          data={listData}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => scrollToBottom(false)}
          onLayout={() => scrollToBottom(false)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListHeaderComponent={
            <>
              {isLoading && (
                <View style={mainStyles.centered}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[mainStyles.hint, { color: theme.textSecondary }]}>Loading messages…</Text>
                </View>
              )}
              {!isLoading && storeMessages.length === 0 && (
                <View style={mainStyles.centered}>
                  <Ionicons name="chatbubbles-outline" size={52} color={theme.primary} />
                  <Text style={[mainStyles.emptyTitle, { color: theme.text }]}>Start a conversation</Text>
                  <Text style={[mainStyles.hint, { color: theme.textSecondary }]}>Be the first to share something!</Text>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => {
            if (item.kind === 'separator') {
              return (
                <DateSeparator
                  label={item.label}
                  cardColor={theme.card}
                  textColor={theme.textSecondary}
                />
              );
            }
            return (
              <MessageBubble
                msg={item.msg}
                isMine={item.msg.senderId === user?.uid}
                fontSize={fontSize}
                theme={theme}
                onLongPress={handleLongPress}
              />
            );
          }}
        />

        {/* InputBar — always at the bottom of KAV's available area */}
        <View style={[mainStyles.inputWrapper, {
          backgroundColor: theme.card,
          paddingBottom: Math.max(insets.bottom, 6),
        }]}>
          <InputBar
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSend}
            onEmojiPress={() => { Keyboard.dismiss(); setShowEmoji(true); }}
            onCancelEdit={() => { setEditingId(null); setInputText(''); }}
            isEditing={!!editingId}
            isSending={isSending}
            isDisabled={!inputText.trim() || !user}
            theme={theme}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>

  );
};

// ─────────────────────────────────────────────────────────
// STYLES — main component only (sub-component styles live
//           next to their components above)
// ─────────────────────────────────────────────────────────

const mainStyles = StyleSheet.create({
  root: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingTop: 8, paddingBottom: 20 },
  centered: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 14 },
  hint: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  // Wraps InputBar — sits below KAV, always touches the bottom safe area
  inputWrapper: { width: '100%' },

});

export default MessagesScreen;
