import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from './theme';
import { Button } from './controls';

export function Popup({
  visible,
  title,
  onClose,
  children,
  footer,
  closeLabel = 'Done',
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
}) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.popupOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel={`Close ${title}`}
          accessibilityRole="button"
          onPress={onClose}
        />
        <View
          style={[styles.popupCard, { maxHeight: height * 0.85 }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={styles.popupHeading}>
            <Text accessibilityRole="header" style={styles.popupTitle} numberOfLines={2}>
              {title}
            </Text>
            <Button label={closeLabel} variant="ghost" compact onPress={onClose} />
          </View>
          <ScrollView
            style={styles.popupBody}
            contentContainerStyle={styles.popupContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer && <View style={styles.popupFooter}>{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  popupFooter: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  popupOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  popupCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  popupHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 8,
    paddingTop: 10,
  },
  popupTitle: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 16, fontWeight: '700' },
  popupBody: { flexShrink: 1 },
  popupContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 10 },
});
