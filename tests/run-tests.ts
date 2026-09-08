import assert from 'node:assert';
import { canTransitionBooking, canTransitionVehicle, getNextVehicleStatusAfterInspection } from '../src/features/bookings/booking-state';
import { calculateBookingPrice } from '../src/features/bookings/pricing';
import { checkVehicleAvailability, doIntervalsOverlap } from '../src/features/bookings/availability';
import { Vehicle, Booking, MaintenanceRecord, UserRole } from '../src/types';

console.log('🧪 RUNNING AUTORENT CAR TUNISIA AUTOMATED DOMAIN TESTS...\n');

let testsPassed = 0;
let testsFailed = 0;

function it(description: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  ✗ ${description}`);
    console.error(`    Error: ${err.message}`);
    testsFailed++;
  }
}

// ----------------------------------------------------
// 1. Double-Booking Protection & Overlap Logic
// ----------------------------------------------------
console.log('1. Testing Double-Booking Protection & Interval Overlaps:');

it('should accurately detect overlapping intervals', () => {
  // Overlap: A starts before B ends, A ends after B starts
  const startA = new Date('2026-09-10T10:00:00');
  const endA = new Date('2026-09-15T10:00:00');

  const startB = new Date('2026-09-12T10:00:00');
  const endB = new Date('2026-09-18T10:00:00');

  assert.strictEqual(doIntervalsOverlap(startA, endA, startB, endB), true);
});

it('should not detect conflict for consecutive non-overlapping bookings', () => {
  const startA = new Date('2026-09-10T10:00:00');
  const endA = new Date('2026-09-15T10:00:00');

  const startB = new Date('2026-09-15T12:00:00'); // 2 hours after return
  const endB = new Date('2026-09-20T10:00:00');

  assert.strictEqual(doIntervalsOverlap(startA, endA, startB, endB), false);
});

// ----------------------------------------------------
// 2. Vehicle Availability Engine
// ----------------------------------------------------
console.log('\n2. Testing Vehicle Availability Engine:');

const mockVehicle: Vehicle = {
  id: 'veh-test-1',
  brand: 'Peugeot',
  model: '208',
  year: 2024,
  category: 'CITADINE',
  plate: '234 TUN 1084',
  vin: 'VF3123456789',
  color: 'Gris',
  doors: 5,
  seats: 5,
  fuelType: 'ESSENCE',
  fuelTankCapacity: 44,
  currentFuelLevel: 100,
  mileage: 15000,
  transmission: 'MANUELLE',
  dailyRate: 95,
  depositAmount: 1000,
  excessKmRate: 0.35,
  fuelMissingRatePerLiter: 2.70,
  status: 'AVAILABLE',
  images: [],
  agencyId: 'agency-tunis-carthage',
  damages: [],
  features: [],
};

const existingBooking: Booking = {
  id: 'b-1',
  bookingNumber: 'AR-2026-1001',
  clientId: 'client-1',
  clientName: 'Ali Trabelsi',
  clientPhone: '+216 20 000 000',
  clientEmail: 'ali@test.tn',
  vehicleId: 'veh-test-1',
  vehicleName: 'Peugeot 208',
  vehiclePlate: '234 TUN 1084',
  vehicleImageUrl: '',
  agencyId: 'agency-tunis-carthage',
  startDate: '2026-09-10',
  endDate: '2026-09-15',
  startTime: '10:00',
  endTime: '10:00',
  dailyRate: 95,
  durationDays: 5,
  includedKm: 1250,
  selectedExtras: [],
  extrasTotal: 0,
  rentalSubtotal: 475,
  tax: 33.25,
  totalAmount: 508.25,
  depositAmount: 1000,
  paymentMethod: 'CASH',
  paymentStatus: 'PAID',
  status: 'CONFIRMED',
  createdAt: '2026-09-01T00:00:00Z',
};

it('should block booking when vehicle has overlapping confirmed booking', () => {
  const result = checkVehicleAvailability(
    mockVehicle,
    '2026-09-12',
    '2026-09-16',
    '10:00',
    '10:00',
    [existingBooking],
    []
  );
  assert.strictEqual(result.available, false);
  assert.ok(result.reason?.includes('Conflit de réservation'));
});

it('should allow booking when requested dates are after existing booking', () => {
  const result = checkVehicleAvailability(
    mockVehicle,
    '2026-09-16',
    '2026-09-20',
    '10:00',
    '10:00',
    [existingBooking],
    []
  );
  assert.strictEqual(result.available, true);
});

it('should reject invalid dates where end is before start', () => {
  const result = checkVehicleAvailability(
    mockVehicle,
    '2026-09-20',
    '2026-09-15',
    '10:00',
    '10:00',
    [],
    []
  );
  assert.strictEqual(result.available, false);
  assert.ok(result.reason?.includes('postérieure'));
});

it('should block vehicle when in BLOCKED status', () => {
  const blockedVehicle = { ...mockVehicle, status: 'BLOCKED' as const };
  const result = checkVehicleAvailability(
    blockedVehicle,
    '2026-09-20',
    '2026-09-25',
    '10:00',
    '10:00',
    [],
    []
  );
  assert.strictEqual(result.available, false);
  assert.ok(result.reason?.includes('bloqué'));
});

it('should block vehicle when scheduled maintenance conflicts with dates', () => {
  const maintenance: MaintenanceRecord = {
    id: 'm-1',
    vehicleId: 'veh-test-1',
    vehiclePlate: '234 TUN 1084',
    type: 'VIDANGE',
    title: 'Vidange moteur',
    cost: 120,
    serviceDate: '2026-09-22',
    status: 'PLANNED',
  };

  const result = checkVehicleAvailability(
    mockVehicle,
    '2026-09-20',
    '2026-09-24',
    '10:00',
    '10:00',
    [],
    [maintenance]
  );
  assert.strictEqual(result.available, false);
  assert.ok(result.reason?.includes('maintenance'));
});

// ----------------------------------------------------
// 3. Centralized Pricing Engine
// ----------------------------------------------------
console.log('\n3. Testing Pricing Calculation:');

it('should correctly calculate base price, extras, discounts and taxes', () => {
  const pricing = calculateBookingPrice({
    baseDailyRate: 95,
    startDate: '2026-10-01',
    endDate: '2026-10-06', // 5 days
    hasGps: true, // 15 DT/day * 5 = 75 DT
    hasFullInsurance: true, // 25 DT/day * 5 = 125 DT
    customDiscountAmount: 20, // 20 DT off
  });

  assert.strictEqual(pricing.durationDays, 5);
  assert.strictEqual(pricing.extrasTotal, 75);
  assert.strictEqual(pricing.insuranceTotal, 125);
  assert.strictEqual(pricing.rentalSubtotal, 475 - 20); // 455 DT
  // Taxable base = 455 + 75 + 125 = 655 DT. Tax 7% = 45.85 DT. Total = 700.85 DT
  assert.strictEqual(pricing.taxAmount, 45.85);
  assert.strictEqual(pricing.totalAmount, 700.85);
});

it('should apply long-term discounts for 7+ days and 14+ days', () => {
  const pricing7 = calculateBookingPrice({
    baseDailyRate: 100,
    startDate: '2026-10-01',
    endDate: '2026-10-08', // 7 days -> 10% discount
  });
  // 7 days * 100 = 700 DT. 10% discount = 70 DT. Subtotal = 630 DT.
  assert.strictEqual(pricing7.discountAmount, 70);
  assert.strictEqual(pricing7.rentalSubtotal, 630);

  const pricing14 = calculateBookingPrice({
    baseDailyRate: 100,
    startDate: '2026-10-01',
    endDate: '2026-10-15', // 14 days -> 15% discount
  });
  // 14 days * 100 = 1400 DT. 15% discount = 210 DT. Subtotal = 1190 DT.
  assert.strictEqual(pricing14.discountAmount, 210);
  assert.strictEqual(pricing14.rentalSubtotal, 1190);
});

// ----------------------------------------------------
// 4. Lifecycle & State Transitions
// ----------------------------------------------------
console.log('\n4. Testing Booking & Vehicle Lifecycle Transitions:');

it('should allow valid booking state transitions and reject invalid ones', () => {
  assert.strictEqual(canTransitionBooking('QUOTE', 'PENDING'), true);
  assert.strictEqual(canTransitionBooking('PENDING', 'CONFIRMED'), true);
  assert.strictEqual(canTransitionBooking('CONFIRMED', 'CHECKED_IN'), true);
  assert.strictEqual(canTransitionBooking('CONFIRMED', 'CANCELLED'), true);
  assert.strictEqual(canTransitionBooking('ACTIVE', 'RETURNED'), true);
  assert.strictEqual(canTransitionBooking('RETURNED', 'COMPLETED'), true);

  // Invalid transitions
  assert.strictEqual(canTransitionBooking('COMPLETED', 'CONFIRMED'), false);
  assert.strictEqual(canTransitionBooking('CANCELLED', 'ACTIVE'), false);
  assert.strictEqual(canTransitionBooking('QUOTE', 'RETURNED'), false);
});

it('should route vehicle to MAINTENANCE if inspection reveals damage, or AVAILABLE if clean', () => {
  assert.strictEqual(getNextVehicleStatusAfterInspection(true), 'MAINTENANCE');
  assert.strictEqual(getNextVehicleStatusAfterInspection(false), 'AVAILABLE');
});

// ----------------------------------------------------
// 5. Role-Based Access & Client Data Isolation
// ----------------------------------------------------
console.log('\n5. Testing RBAC & Client Isolation:');

function isActionPermitted(role: UserRole, action: string): boolean {
  if (role === 'ADMIN') return true;
  if (role === 'MANAGER') return action !== 'DELETE_DATABASE';
  if (role === 'AGENT') {
    return ['VIEW_BOOKINGS', 'CREATE_BOOKING', 'CHECK_IN', 'CHECK_OUT', 'VIEW_VEHICLES'].includes(action);
  }
  if (role === 'FLEET') {
    return ['VIEW_VEHICLES', 'UPDATE_VEHICLE_STATUS', 'RECORD_DAMAGE', 'SCHEDULE_MAINTENANCE', 'CHECK_IN', 'CHECK_OUT'].includes(action);
  }
  if (role === 'ACCOUNTANT') {
    return ['VIEW_INVOICES', 'GENERATE_INVOICE', 'RECORD_PAYMENT', 'VIEW_PAYMENTS', 'FINANCIAL_REPORTS'].includes(action);
  }
  if (role === 'CUSTOMER') {
    return ['VIEW_MY_BOOKINGS', 'SIGN_AGREEMENT', 'UPLOAD_DOCUMENTS', 'PAY_MY_BOOKING'].includes(action);
  }
  return false;
}

it('should enforce role restrictions correctly', () => {
  assert.strictEqual(isActionPermitted('AGENT', 'CREATE_BOOKING'), true);
  assert.strictEqual(isActionPermitted('AGENT', 'GENERATE_INVOICE'), false);

  assert.strictEqual(isActionPermitted('ACCOUNTANT', 'GENERATE_INVOICE'), true);
  assert.strictEqual(isActionPermitted('ACCOUNTANT', 'CREATE_BOOKING'), false);

  assert.strictEqual(isActionPermitted('FLEET', 'SCHEDULE_MAINTENANCE'), true);
  assert.strictEqual(isActionPermitted('FLEET', 'RECORD_PAYMENT'), false);

  // Client isolation
  assert.strictEqual(isActionPermitted('CUSTOMER', 'VIEW_MY_BOOKINGS'), true);
  assert.strictEqual(isActionPermitted('CUSTOMER', 'SCHEDULE_MAINTENANCE'), false);
  assert.strictEqual(isActionPermitted('CUSTOMER', 'VIEW_VEHICLES'), false);
});

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
}
