import { Payment, PaymentStatus, Invoice, InvoiceStatus, Booking, UserRole } from '../types';
import { setFirestoreDoc } from '../lib/firebase';
import { logActivity } from './audit.service';

export class PaymentsService {
  static async recordPayment(
    paymentData: Omit<Payment, 'id' | 'createdAt'>,
    actor = 'Comptable',
    actorRole: UserRole = 'ACCOUNTANT'
  ): Promise<{ success: boolean; payment: Payment }> {
    const id = `pay-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const payment: Payment = {
      ...paymentData,
      id,
      createdAt: new Date().toISOString(),
    };

    await setFirestoreDoc('payments', id, payment);
    await logActivity(
      actor,
      actorRole,
      'RECORD_PAYMENT',
      `Paiement de ${payment.amount} ${payment.currency} enregistré (${payment.method}, statut: ${payment.status}) pour réservation #${payment.bookingNumber || payment.bookingId}`,
      'PAYMENT',
      id,
      undefined,
      payment.amount
    );

    // If payment is PAID, update booking paid amount
    return { success: true, payment };
  }

  static async generateInvoiceFromBooking(
    booking: Booking,
    actor = 'Comptable',
    actorRole: UserRole = 'ACCOUNTANT'
  ): Promise<{ success: boolean; invoice: Invoice }> {
    const invoiceNum = `INV-AR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `inv-${Date.now()}`;

    const invoice: Invoice = {
      id,
      invoiceNumber: invoiceNum,
      bookingId: booking.id,
      clientName: booking.clientName,
      clientAddress: 'Tunisie',
      clientEmail: booking.clientEmail,
      vehicleInfo: `${booking.vehicleName} (${booking.vehiclePlate})`,
      agencyName: 'AUTORENT CAR TUNISIA - Tunis Carthage',
      agencyAddress: 'Aéroport International de Tunis-Carthage, 1080 Tunis, Tunisie',
      date: new Date().toISOString().split('T')[0],
      dueDate: booking.endDate,
      items: [
        {
          description: `Location véhicule ${booking.vehicleName} (${booking.durationDays} j)`,
          quantity: booking.durationDays,
          unitPrice: booking.dailyRate,
          total: booking.rentalSubtotal,
        },
        ...(booking.extrasTotal > 0
          ? [
              {
                description: 'Options & Équipements additionnels (GPS, Siège enfant, etc.)',
                quantity: 1,
                unitPrice: booking.extrasTotal,
                total: booking.extrasTotal,
              },
            ]
          : []),
      ],
      subtotal: booking.rentalSubtotal + booking.extrasTotal,
      taxRate: 0.07,
      taxAmount: booking.tax,
      totalAmount: booking.totalAmount,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      status: booking.paymentStatus === 'PAID' ? 'PAID' : 'ISSUED',
    };

    await setFirestoreDoc('invoices', id, invoice);
    await logActivity(
      actor,
      actorRole,
      'GENERATE_INVOICE',
      `Facture émise #${invoiceNum} pour un montant de ${invoice.totalAmount} DT (${booking.clientName})`,
      'INVOICE',
      id,
      undefined,
      invoice.totalAmount
    );

    return { success: true, invoice };
  }

  static async updateInvoiceStatus(
    invoice: Invoice,
    newStatus: InvoiceStatus,
    actor = 'Comptable',
    actorRole: UserRole = 'ACCOUNTANT'
  ): Promise<{ success: boolean }> {
    const updated = {
      ...invoice,
      status: newStatus,
    };
    await setFirestoreDoc('invoices', invoice.id, updated);
    await logActivity(
      actor,
      actorRole,
      'UPDATE_INVOICE',
      `Facture #${invoice.invoiceNumber} passée en statut ${newStatus}`,
      'INVOICE',
      invoice.id
    );
    return { success: true };
  }
}
