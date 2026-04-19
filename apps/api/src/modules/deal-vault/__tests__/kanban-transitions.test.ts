import { describe, it, expect } from 'vitest';
import { BookingStateMachine } from '../../booking/state-machine.js';
import { BookingState } from '@artist-booking/shared';

/**
 * Validates every drag-drop transition exposed by the agency Kanban
 * (/event-company/deals) is allowed by the booking state machine.
 * If a column is added to KANBAN_COLUMNS on the web side, add its
 * transitions here too.
 */
describe('Agency Kanban drag-drop transitions', () => {
  const KANBAN_STATES: BookingState[] = [
    BookingState.INQUIRY,
    BookingState.QUOTED,
    BookingState.NEGOTIATING,
    BookingState.CONFIRMED,
    BookingState.COMPLETED,
    BookingState.CANCELLED,
  ];

  const REQUIRED_FORWARD: Array<[BookingState, BookingState]> = [
    [BookingState.INQUIRY, BookingState.QUOTED],
    [BookingState.QUOTED, BookingState.NEGOTIATING],
    [BookingState.QUOTED, BookingState.CONFIRMED],
    [BookingState.NEGOTIATING, BookingState.CONFIRMED],
  ];

  const REQUIRED_CANCEL: BookingState[] = [
    BookingState.INQUIRY,
    BookingState.QUOTED,
    BookingState.NEGOTIATING,
  ];

  it('exposes exactly 6 columns', () => {
    expect(KANBAN_STATES).toHaveLength(6);
  });

  it.each(REQUIRED_FORWARD)('allows %s → %s', (from, to) => {
    expect(BookingStateMachine.canTransition(from, to)).toBe(true);
  });

  it.each(REQUIRED_CANCEL)('allows %s → cancelled', (from) => {
    expect(BookingStateMachine.canTransition(from, BookingState.CANCELLED)).toBe(true);
  });

  it('rejects completed → inquiry (no resurrection)', () => {
    expect(BookingStateMachine.canTransition(BookingState.COMPLETED, BookingState.INQUIRY)).toBe(false);
  });

  it('rejects cancelled → confirmed (no reopen without explicit flow)', () => {
    expect(BookingStateMachine.canTransition(BookingState.CANCELLED, BookingState.CONFIRMED)).toBe(false);
  });
});
