import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@/lib/clerk/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    tenantId: 'test-tenant-id',
    isDemoMode: false,
    isLoading: false,
    authLoading: false,
  })),
}));

global.fetch = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/roster',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('zustand', async () => {
  const actual = await vi.importActual('zustand');
  return {
    ...actual,
    create: vi.fn((fn) => {
      let state = fn((partial) => { state = { ...state, ...partial }; }, () => state, undefined);
      return () => state;
    }),
  };
});

vi.mock('zustand/middleware/immer', () => ({
  immer: (fn: any) => fn,
}));

vi.mock('date-fns', () => ({
  format: vi.fn((date, fmt) => {
    if (fmt === 'dd/MM/yyyy') return '01/01/2026';
    if (fmt === 'HH:mm') return '09:00';
    if (fmt === 'h:mm a') return '9:00 AM';
    if (fmt === 'MMM d') return 'Jan 1';
    if (fmt === 'MMM d, yyyy') return 'Jan 1, 2026';
    if (fmt === 'EEEE, MMMM d, yyyy') return 'Monday, January 1, 2026';
    if (fmt === 'yyyy-MM-dd') return '2026-01-01';
    return String(date);
  }),
  startOfWeek: vi.fn((date) => new Date(date)),
  endOfWeek: vi.fn((date) => new Date(date)),
}));

const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('Warning:')) return;
  originalError.apply(console, args);
};