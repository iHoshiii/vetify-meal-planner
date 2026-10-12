import { StyleSheet } from 'react-native';
import { colors } from '../../components/ui';
export const styles = StyleSheet.create({
  screen: { gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '600', flex: 1 },
  foodName: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  link: { color: colors.primary, fontSize: 13 },
  detailsButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 6 },
  table: { gap: 4 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 42,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  nutrient: { flex: 1.2, minWidth: 0 },
  nutrientName: { color: colors.ink, fontSize: 12, fontWeight: '500' },
  unit: { color: colors.muted, fontSize: 10 },
  tableHeading: { flex: 1, fontSize: 10, color: colors.muted, textAlign: 'right' },
  tableValue: { flex: 1, minWidth: 0, fontSize: 12, color: colors.ink, textAlign: 'right' },
  remaining: { color: colors.primary, fontWeight: '600' },
});
