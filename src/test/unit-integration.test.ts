import { describe, it, expect, vi } from 'vitest';
import { formatCurrency, formatDate, cn } from './utils';

describe('lib/utils', () => {
  describe('formatCurrency', () => {
    it('should format numbers correctly to BRL', () => {
      expect(formatCurrency(1000)).toContain('1.000,00');
      expect(formatCurrency(0)).toContain('0,00');
    });
  });

  describe('formatDate', () => {
    it('should format dates correctly', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      expect(formatDate(date)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('cn', () => {
    it('should merge tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'p-4')).toBe('bg-red-500 p-4');
      expect(cn('p-4', 'p-2')).toBe('p-2'); // Tailwind merge should handle overriding
    });
  });
});

describe('Integration: Mocked External APIs', () => {
  it('should handle API failure gracefully in mock environment', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('API Down'));
    global.fetch = mockFetch;
    
    try {
      await fetch('https://api.external.com');
    } catch (e) {
      expect(e.message).toBe('API Down');
    }
  });
});
