import { BookingState, BOOKING_STATE_TRANSITIONS } from '@artist-booking/shared';

export class BookingStateMachine {
  /**
   * Check if a state transition is valid.
   */
  static canTransition(from: BookingState, to: BookingState): boolean {
    const allowed = BOOKING_STATE_TRANSITIONS[from];
    return allowed?.includes(to) ?? false;
  }

  /**
   * Validate and return the new state, or throw if invalid.
   */
  static transition(from: BookingState, to: BookingState): BookingState {
    if (!this.canTransition(from, to)) {
      throw new BookingStateError(
        'INVALID_TRANSITION',
        `Cannot transition from ${from} to ${to}`,
        400,
      );
    }
    return to;
  }

  /**
   * Get all valid next states from the current state.
   */
  static getNextStates(current: BookingState): BookingState[] {
    return BOOKING_STATE_TRANSITIONS[current] ?? [];
  }

  /**
   * Check if a booking is in a terminal state (no further transitions possible).
   */
  static isTerminal(state: BookingState): boolean {
    return this.getNextStates(state).length === 0;
  }

  /**
   * Check if a booking can be cancelled from its current state.
   */
  static canCancel(state: BookingState): boolean {
    return this.canTransition(state, BookingState.CANCELLED);
  }
}

export class BookingStateError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'BookingStateError';
  }
}
