import Svg, { Path } from 'react-native-svg';
import { colors } from './theme';

const paths = {
  paw: 'M12 12c-2 0-2.6 2.6-4.6 4C5.5 17.4 6.1 21 8.6 21c1.3 0 2.1-.7 3.4-.7s2.1.7 3.4.7c2.5 0 3.1-3.6 1.2-5-2-1.4-2.6-4-4.6-4ZM6 7c-1.5 0-2 1.5-1.5 3S6 12 7 11.5 7.5 9 7 8 6.5 7 6 7Zm12 0c1.5 0 2 1.5 1.5 3S18 12 17 11.5 16.5 9 17 8s.5-1 1-1ZM9.5 3c-1.5 0-2 1.5-1.5 3S9.5 8 10.5 7.5 11 5 10.5 4s-.5-1-1-1Zm5 0c1.5 0 2 1.5 1.5 3s-1.5 2-2.5 1.5S13 5 13.5 4s.5-1 1-1Z',
  plus: 'M12 5v14M5 12h14',
  'chevron-right': 'm9 5 7 7-7 7',
  'chevron-left': 'm15 5-7 7 7 7',
  'chevron-down': 'm5 9 7 7 7-7',
  chart: 'M4 3v18h17M8 17v-6m5 6V6m5 11v-9',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  download: 'M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5',
  logout: 'M9 4H4v16h5m-1-8h13m-5-5 5 5-5 5',
  check: 'm5 12 4 4L19 6',
  mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  calendar: 'M4 5h16v16H4V5Zm4-3v6m8-6v6M4 10h16',
  bowl: 'M3 11h18c0 6-3 9-9 9s-9-3-9-9ZM8 4v3m4-4v4m4-3v3',
  edit: 'm14 5 5 5M4 20l1-6L16 3l5 5-11 11-6 1Z',
} as const;

export function AppIcon({
  name,
  size = 20,
  color = colors.primary,
}: {
  name: keyof typeof paths;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
