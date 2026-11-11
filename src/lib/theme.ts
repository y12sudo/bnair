import { type TextStyle, useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  text: string;
  secondary: string;
  tertiary: string;
  hairline: string;
  separator: string;
  glassFill: string;
  glassFillSolid: string;
  card: string;
  fill: string;
  accent: string;
  accent2: string;
  onAccent: string;
  success: string;
  danger: string;
  backdrop: readonly [string, string, string];
  blobs: readonly [string, string, string];
  board: string;
  shadow: string;
  blurTint: 'systemThinMaterialLight' | 'systemThinMaterialDark';
}

const light: Theme = {
  dark: false,
  text: '#0B0B0F',
  secondary: 'rgba(60,60,67,0.62)',
  tertiary: 'rgba(60,60,67,0.32)',
  hairline: 'rgba(255,255,255,0.65)',
  separator: 'rgba(60,60,67,0.12)',
  glassFill: 'rgba(255,255,255,0.55)',
  glassFillSolid: 'rgba(255,255,255,0.86)',
  card: '#FBF8F7',
  fill: 'rgba(120,120,128,0.12)',
  accent: '#FF3B6B',
  accent2: '#FF8A3D',
  onAccent: '#FFFFFF',
  success: '#30C26B',
  danger: '#FF3B30',
  backdrop: ['#FFE9E1', '#F4E8FF', '#E3F0FF'],
  blobs: ['#FFB199', '#C9A7FF', '#8EC5FF'],
  board: 'rgba(255,255,255,0.7)',
  shadow: '#5B3A6B',
  blurTint: 'systemThinMaterialLight',
};

const dark: Theme = {
  dark: true,
  text: '#F5F5F7',
  secondary: 'rgba(235,235,245,0.62)',
  tertiary: 'rgba(235,235,245,0.3)',
  hairline: 'rgba(255,255,255,0.14)',
  separator: 'rgba(84,84,88,0.5)',
  glassFill: 'rgba(36,36,44,0.55)',
  glassFillSolid: 'rgba(30,30,36,0.92)',
  card: '#1E1D26',
  fill: 'rgba(118,118,128,0.24)',
  accent: '#FF4F7B',
  accent2: '#FF9A4D',
  onAccent: '#FFFFFF',
  success: '#32D74B',
  danger: '#FF453A',
  backdrop: ['#0B0A14', '#140F24', '#07131F'],
  blobs: ['#7A2E4A', '#3E2A7A', '#164A6E'],
  board: 'rgba(28,28,34,0.7)',
  shadow: '#000000',
  blurTint: 'systemThinMaterialDark',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { sm: 12, md: 18, lg: 26, xl: 34 };

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 17, fontWeight: '400', letterSpacing: -0.2 },
  callout: { fontSize: 15, fontWeight: '500', letterSpacing: -0.1 },
  footnote: { fontSize: 13, fontWeight: '500' },
  eyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;
