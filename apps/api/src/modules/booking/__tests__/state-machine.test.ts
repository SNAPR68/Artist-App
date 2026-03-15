import { describe, it, expect } from 'vitest';
import { BookingStateMachine, BookingStateError } from '../state-machine.js';
import { BookingState } from '@artist-booking/shared';

describe('BookingStateMachine', () => {
  describe('canTransition', () => {
    it('should allow inquiry → quoted', () => {
      expect(BookingStateMachine.canTransition(BookingState.INQUIRY, BookingState.QUOTED)).toBe(true);
    });

    it('should allow inquiry → cancelled', () => {
      expect(BookingStateMachine.canTransition(BookingState.INQUIRY, BookingState.CANCELLED)).toBe(true);
    });

    it('should allow quoted → confirmed', () => {
      expect(BookingStateMachine.canTransition(BookingState.QUOTED, BookingState.CONFIRMED)).toBe(true);
    });

    it('should allow quoted → negotiating', () => {
      expect(BookingStateMachine.canTransition(BookingState.QUOTED, BookingState.NEGOTIATING)).toBe(true);
    });

    it('should allow negotiating → confirmed', () => {
      expect(BookingStateMachine.canTransition(BookingState.NEGOTIATING, BookingState.CONFIRMED)).toBe(true);
    });

    it('should allow confirmed → pre_event', () => {
      expect(BookingStateMachine.canTransition(BookingState.CONFIRMED, BookingState.PRE_EVENT)).toBe(true);
    });

    it('should allow completed → settled', () => {
      expect(BookingStateMachine.canTransition(BookingState.COMPLETED, BookingState.SETTLED)).toBe(true);
    });

    it('should reject inquiry → confirmed (skip quoted)', () => {
      expect(BookingStateMachine.canTransition(BookingState.INQUIRY, BookingState.CONFIRMED)).toBe(false);
    });

    it('should reject settled → anything (terminal)', () => {
      expect(BookingStateMachine.canTransition(BookingState.SETTLED, BookingState.CANCELLED)).toBe(false);
    });

    it('should reject cancelled → anything (terminal)', () => {
      expect(BookingStateMachine.canTransition(BookingState.CANCELLED, BookingState.INQUIRY)).toBe(false);
    });

    it('should reject expired → anything (terminal)', () => {
      expect(BookingStateMachine.canTransition(BookingState.EXPIRED, BookingState.INQUIRY)).toBe(false);
    });

    it('should reject backward transitions (confirmed → quoted)', () => {
      expect(BookingStateMachine.canTransition(BookingState.CONFIRMED, BookingState.QUOTED)).toBe(false);
    });

    it('should allow disputed → settled', () => {
      expect(BookingStateMachine.canTransition(BookingState.DISPUTED, BookingState.SETTLED)).toBe(true);
    });

    it('should allow disputed → cancelled', () => {
      expect(BookingStateMachine.canTransition(BookingState.DISPUTED, BookingState.CANCELLED)).toBe(true);
    });
  });

  describe('transition', () => {
    it('should return new state for valid transitions', () => {
      const result = BookingStateMachine.transition(BookingState.INQUIRY, BookingState.QUOTED);
      expect(result).toBe(BookingState.QUOTED);
    });

    it('should throw BookingStateError for invalid transitions', () => {
      expect(() =>
        BookingStateMachine.transition(BookingState.SETTLED, BookingState.INQUIRY),
      ).toThrow(BookingStateError);
    });
  });

  describe('isTerminal', () => {
    it('should return true for settled', () => {
      expect(BookingStateMachine.isTerminal(BookingState.SETTLED)).toBe(true);
    });

    it('should return true for cancelled', () => {
      expect(BookingStateMachine.isTerminal(BookingState.CANCELLED)).toBe(true);
    });

    it('should return true for expired', () => {
      expect(BookingStateMachine.isTerminal(BookingState.EXPIRED)).toBe(true);
    });

    it('should return false for inquiry', () => {
      expect(BookingStateMachine.isTerminal(BookingState.INQUIRY)).toBe(false);
    });
  });

  describe('canCancel', () => {
    it('should return true for inquiry', () => {
      expect(BookingStateMachine.canCancel(BookingState.INQUIRY)).toBe(true);
    });

    it('should return true for confirmed', () => {
      expect(BookingStateMachine.canCancel(BookingState.CONFIRMED)).toBe(true);
    });

    it('should return false for completed', () => {
      expect(BookingStateMachine.canCancel(BookingState.COMPLETED)).toBe(false);
    });

    it('should return false for settled', () => {
      expect(BookingStateMachine.canCancel(BookingState.SETTLED)).toBe(false);
    });
  });

  describe('getNextStates', () => {
    it('should return valid next states for inquiry', () => {
      const next = BookingStateMachine.getNextStates(BookingState.INQUIRY);
      expect(next).toContain(BookingState.QUOTED);
      expect(next).toContain(BookingState.CANCELLED);
      expect(next).not.toContain(BookingState.CONFIRMED);
    });

    it('should return empty array for terminal states', () => {
      expect(BookingStateMachine.getNextStates(BookingState.SETTLED)).toEqual([]);
    });
  });
});
