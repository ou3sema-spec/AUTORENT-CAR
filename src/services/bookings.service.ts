import { Booking, BookingStatus, UserRole, Vehicle, MaintenanceRecord } from '../types';
import { setFirestoreDoc, deleteFirestoreDoc } from '../lib/firebase';
import { logActivity } from './audit.service';
import { canTransitionBooking } from '../features/bookings/booking-state';
import { checkVehicleAvailability } from '../features/bookings/availability';
import { calculateBookingPrice } from '../features/bookings/pricing';

export interface CreateBookingResult {
  success: boolean;
  booking?: Booking;
  error?: string;
}

export class BookingsService {
  /**
   * Section 15: Double-booking protection & creation
   */
  static async createBooking(
    bookingData: Omit<Booking, 'id' | 'bookingNumber' | 'createdAt'>,
    vehicle: Vehicle,
    existingBookings: Booking[],
    maintenances: MaintenanceRecord[],
    actor = 'Agent Comptoir',
    actorRole: UserRole = 'AGENT'
  ): Promise<CreateBookingResult> {
    // 1. Double-booking check
    const availability = checkVehicleAvailability(
      vehicle,
      bookingData.startDate,
      bookingData.endDate,
      bookingData.startTime,
      bookingData.endTime,
      existingBookings,
      maintenances
    );

    if (!availability.available) {
      return {
        success: false,
        error: availability.reason || 'Conflit de réservation détecté. Véhicule indisponible sur cette période.',
      };
    }

    // 2. Generate unique booking number
    const timestamp = Date.now();
    const shortRandom = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `AR-${new Date().getFullYear()}-${shortRandom}`;
    const id = `booking-${timestamp}`;

    const newBooking: Booking = {
      ...bookingData,
      id,
      bookingNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. Persist to Firestore
    await setFirestoreDoc('bookings', id, newBooking);

    // 4. Update vehicle status if confirmed
    if (newBooking.status === 'CONFIRMED' && vehicle.status === 'AVAILABLE') {
      await setFirestoreDoc('vehicles', vehicle.id, {
        ...vehicle,
        status: 'RESERVED',
      });
    }

    // 5. Activity Log
    await logActivity(
      actor,
      actorRole,
      'CREATE_BOOKING',
      `Création réservation #${bookingNumber} pour ${newBooking.clientName} (${newBooking.vehicleName})`,
      'BOOKING',
      id,
      undefined,
      newBooking.totalAmount
    );

    return { success: true, booking: newBooking };
  }

  /**
   * Updates an existing booking with transition validation
   */
  static async updateBooking(
    booking: Booking,
    updates: Partial<Booking>,
    actor = 'Agent',
    actorRole: UserRole = 'AGENT'
  ): Promise<{ success: boolean; updatedBooking?: Booking; error?: string }> {
    if (updates.status && updates.status !== booking.status) {
      if (!canTransitionBooking(booking.status, updates.status)) {
        return {
          success: false,
          error: `Transition de statut invalide : impossible de passer de ${booking.status} à ${updates.status}.`,
        };
      }
    }

    const updated: Booking = {
      ...booking,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await setFirestoreDoc('bookings', booking.id, updated);

    const amountBefore = booking.totalAmount;
    const amountAfter = updated.totalAmount;
    const priceChangeDetail = amountBefore !== amountAfter ? ` (${amountBefore} DT → ${amountAfter} DT)` : '';

    await logActivity(
      actor,
      actorRole,
      'UPDATE_BOOKING',
      `Mise à jour réservation #${booking.bookingNumber}${priceChangeDetail}`,
      'BOOKING',
      booking.id,
      amountBefore,
      amountAfter
    );

    return { success: true, updatedBooking: updated };
  }

  /**
   * Confirm booking
   */
  static async confirmBooking(
    booking: Booking,
    actor = 'Agent',
    actorRole: UserRole = 'AGENT'
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateBooking(booking, { status: 'CONFIRMED' }, actor, actorRole);
  }

  /**
   * Cancel booking
   */
  static async cancelBooking(
    booking: Booking,
    reason: string,
    vehicle?: Vehicle,
    actor = 'Agent',
    actorRole: UserRole = 'AGENT'
  ): Promise<{ success: boolean; error?: string }> {
    const res = await this.updateBooking(
      booking,
      {
        status: 'CANCELLED',
        notes: booking.notes ? `${booking.notes}\n[Annulé: ${reason}]` : `[Annulé: ${reason}]`,
      },
      actor,
      actorRole
    );

    if (res.success && vehicle && (vehicle.status === 'RESERVED' || vehicle.status === 'PREPARING')) {
      await setFirestoreDoc('vehicles', vehicle.id, {
        ...vehicle,
        status: 'AVAILABLE',
      });
    }

    return res;
  }

  /**
   * Extend an active booking
   */
  static async extendBooking(
    booking: Booking,
    newEndDate: string,
    newEndTime: string,
    vehicle: Vehicle,
    existingBookings: Booking[],
    maintenances: MaintenanceRecord[],
    actor = 'Agent',
    actorRole: UserRole = 'AGENT'
  ): Promise<{ success: boolean; updatedBooking?: Booking; error?: string }> {
    // Check vehicle availability for extension
    const availability = checkVehicleAvailability(
      vehicle,
      booking.endDate,
      newEndDate,
      booking.endTime,
      newEndTime,
      existingBookings,
      maintenances,
      booking.id
    );

    if (!availability.available) {
      return {
        success: false,
        error: `Impossible de prolonger : ${availability.reason}`,
      };
    }

    // Recalculate price
    const newPricing = calculateBookingPrice({
      baseDailyRate: booking.dailyRate,
      startDate: booking.startDate,
      endDate: newEndDate,
      startTime: booking.startTime,
      endTime: newEndTime,
      hasGps: booking.hasGps,
      hasChildSeat: booking.hasChildSeat,
      hasExtraDriver: booking.hasExtraDriver,
      hasFullInsurance: booking.hasFullInsurance,
    });

    return this.updateBooking(
      booking,
      {
        endDate: newEndDate,
        endTime: newEndTime,
        durationDays: newPricing.durationDays,
        rentalSubtotal: newPricing.rentalSubtotal,
        extrasTotal: newPricing.extrasTotal,
        tax: newPricing.taxAmount,
        totalAmount: newPricing.totalAmount,
      },
      actor,
      actorRole
    );
  }

  /**
   * Record digital rental agreement signature
   */
  static async recordSignature(
    booking: Booking,
    signatureUrl: string,
    actor = 'Client Portal'
  ): Promise<{ success: boolean }> {
    const updated: Partial<Booking> = {
      agreementSigned: true,
      agreementSignatureUrl: signatureUrl,
      signedAt: new Date().toISOString(),
    };

    await setFirestoreDoc('bookings', booking.id, updated);
    await logActivity(
      actor,
      'CUSTOMER',
      'SIGN_AGREEMENT',
      `Signature numérique du contrat de location #${booking.bookingNumber}`,
      'BOOKING',
      booking.id
    );

    return { success: true };
  }
}
