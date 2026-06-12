/**
 * CrewCircle Design Tokens
 * Based on UI/UX Pro Max recommendations for business card scanner app
 * Style: Flat Design Mobile (Touch-First)
 */

export const colors = {
  // Primary palette
  primary: '#1E293B',
  onPrimary: '#FFFFFF',
  secondary: '#334155',
  accent: '#2563EB', // Scan blue - used for CTAs and active states
  
  // Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  muted: '#F1F2F3',
  
  // Text
  foreground: '#0F172A',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  
  // Borders
  border: '#E4E5E7',
  borderLight: '#F1F5F9',
  
  // Semantic
  destructive: '#DC2626',
  destructiveLight: '#FEE2E2',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#2563EB',
  infoLight: '#DBEAFE',
  
  // Interactive states
  focusRing: '#1E293B',
  pressed: '#0F172A',
  
  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    regular: 'Inter',
    medium: 'Inter',
    semibold: 'Inter',
    bold: 'Inter',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const touchTarget = {
  minimum: 44, // 44x44pt minimum per Apple HIG
  recommended: 48, // 48x48dp recommended per Material Design
} as const;

export const shadows = {
  none: undefined,
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// Screen-specific header colors (maintaining existing blue header pattern)
export const headerColors = {
  background: colors.accent, // #2563EB
  text: colors.onPrimary,
} as const;

export type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  touchTarget: typeof touchTarget;
  shadows: typeof shadows;
  headerColors: typeof headerColors;
};

export const theme: Theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  touchTarget,
  shadows,
  headerColors,
};
