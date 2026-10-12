import { StyleSheet } from 'react-native';
import { colors } from '../../components/ui';
export const styles = StyleSheet.create({
  container: { gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: colors.ink, fontSize: 24, fontWeight: '700' },
  stepHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  progress: { color: colors.muted, fontSize: 13 },
  track: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  complete: { backgroundColor: colors.primary },
  fields: { gap: 14 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  nutrientRow: { flexDirection: 'row', gap: 10 },
  nutrientField: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  backAction: { flex: 1, minWidth: 0 },
  saveAction: { flex: 2, minWidth: 0 },
  preview: { width: '100%', height: 150, borderRadius: 12, backgroundColor: colors.soft },
});
