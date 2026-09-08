export type UserRole = 
  | 'ADMIN' 
  | 'MANAGER' 
  | 'AGENT' 
  | 'FLEET' 
  | 'ACCOUNTANT'
  | 'CUSTOMER'
  | 'AGENT_COMPTOIR'
  | 'AGENT_TECHNIQUE';

// Section 14: Vehicle Lifecycle
export type VehicleStatus = 
  | 'AVAILABLE' 
  | 'RESERVED' 
  | 'PREPARING' 
  | 'RENTED' 
  | 'RETURNED' 
  | 'INSPECTION' 
  | 'MAINTENANCE' 
  | 'BLOCKED'
  | 'UNAVAILABLE';

export type VehicleCategory = 
  | 'CITADINE' 
  | 'COMPACTE' 
  | 'BERLINE' 
  | 'SUV' 
  | 'UTILITAIRE' 
  | 'PREMIUM' 
  | 'ELECTRIQUE';

export type FuelType = 'ESSENCE' | 'DIESEL' | 'HYBRIDE' | 'ELECTRIQUE';
export type Transmission = 'MANUELLE' | 'AUTOMATIQUE';

// Section 13: Booking Lifecycle
export type BookingStatus = 
  | 'QUOTE' 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'CHECKED_IN' 
  | 'ACTIVE' 
  | 'RETURNED' 
  | 'COMPLETED' 
  | 'CANCELLED'
  | 'IN_PROGRESS';

export type PaymentMethod = 'STRIPE_CARD' | 'CASH' | 'TRANSFER' | 'CHEQUE' | 'ONLINE_TND';

// Section 25: Payment States
export type PaymentStatus = 
  | 'PENDING' 
  | 'AUTHORIZED' 
  | 'PAID' 
  | 'PARTIALLY_PAID' 
  | 'REFUNDED' 
  | 'FAILED' 
  | 'CANCELLED';

// Section 26: Invoice States
export type InvoiceStatus = 
  | 'DRAFT' 
  | 'ISSUED' 
  | 'PAID' 
  | 'PARTIALLY_PAID' 
  | 'OVERDUE' 
  | 'VOID';

export type DamageZone = 'FRONT' | 'REAR' | 'LEFT' | 'RIGHT' | 'ROOF' | 'WINDSHIELD' | 'WHEELS' | 'INTERIOR' | 'DASHBOARD';
export type DamageType = 'SCRATCH' | 'DENT' | 'CRACK' | 'STAIN' | 'BROKEN_PART' | 'TEAR' | 'OTHER';
export type DamageSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Section 22: Damage Management Statuses
export type DamageStatus = 
  | 'OPEN' 
  | 'ASSESSED' 
  | 'REPAIRING' 
  | 'RESOLVED' 
  | 'CHARGED_TO_CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agencyId: string;
  pinCode: string; // 4 or 6 digits PIN for security access
  avatarUrl?: string;
  phone?: string;
  jobTitle?: string;
  active?: boolean;
  createdAt?: string;
}

export type MaintenanceType = 
  | 'VIDANGE' 
  | 'PLAQUETTES_FREIN' 
  | 'DISQUES_FREIN'
  | 'PNEUMATIQUES' 
  | 'FILTRES' 
  | 'CONTROLE_TECHNIQUE' 
  | 'REVISION_GENERALE' 
  | 'CARROSSERIE'
  | 'AUTRE';

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleName?: string;
  type: MaintenanceType;
  title: string;
  description?: string;
  cost: number;
  mileageAtService?: number;
  mileage?: number;
  serviceDate?: string;
  scheduledDate?: string;
  date?: string;
  nextDueMileage?: number;
  nextDueDate?: string;
  technicianName?: string;
  performedBy?: string;
  garageName?: string;
  garage?: string;
  invoiceRef?: string;
  status: 'DONE' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SCHEDULED' | 'CANCELLED';
}

export interface Agency {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  openHours: string;
  coordinates: { lat: number; lng: number };
}

export interface ClientDocument {
  id: string;
  type: 'PERMIS_RECTO' | 'PERMIS_VERSO' | 'CIN_RECTO' | 'CIN_VERSO' | 'PASSEPORT' | 'JUSTIFICATIF_DOMICILE';
  name: string;
  url: string;
  uploadedAt: string;
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cinOrPassport?: string;
  licenseNumber: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  isLicenseExpiringSoon?: boolean;
  birthDate?: string;
  address?: string;
  city?: string;
  nationality?: string;
  vipStatus?: boolean;
  notes?: string;
  totalBookings: number;
  documents: ClientDocument[];
  createdAt: string;
}

export interface DamageItem {
  id: string;
  zone: DamageZone;
  x?: number; // % coordinates on diagram
  y?: number;
  type: DamageType;
  severity: DamageSeverity;
  description: string;
  photoUrl?: string;
  addedAt: string;
  addedByCheckType?: 'CHECK_IN' | 'CHECK_OUT' | 'MANUAL';
  estimatedCost?: number;
  isPreExisting?: boolean;
  status?: DamageStatus;
}

// Section 22: Structured Damage Record
export interface DamageRecord {
  id: string;
  vehicleId: string;
  bookingId?: string;
  inspectionId?: string;
  location: string;
  description: string;
  severity: DamageSeverity;
  photos: string[];
  createdBy: string;
  createdAt: string;
  resolvedAt?: string;
  repairCost: number;
  status: DamageStatus;
}

// Section 19 & 20: Vehicle Profiles & Profitability
export interface VehicleProfitability {
  totalRevenue: number;
  maintenanceCost: number;
  insuranceCost: number;
  otherExpenses: number;
  netContribution: number;
  utilizationRate: number; // percentage (0-100%)
  revenuePerAvailableDay: number;
  costPerKilometer: number;
  averageRentalValue: number;
  totalRentalDays: number;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: VehicleCategory;
  plate: string; // Tunisian plate, e.g. "234 TUN 5678"
  vin: string;
  color: string;
  doors: number;
  seats: number;
  fuelType: FuelType;
  fuelTankCapacity: number; // in Liters
  currentFuelLevel: number; // 0 to 100%
  mileage: number;
  transmission: Transmission;
  dailyRate: number; // in TND (DT)
  depositAmount: number;
  insuranceRate?: number;
  excessKmRate: number; // Cost per excess km in DT, e.g. 0.35
  fuelMissingRatePerLiter: number; // e.g. 2.70 DT
  status: VehicleStatus;
  images: string[];
  agencyId: string;
  location?: string;
  damages: DamageItem[];
  features: string[];
  nextMaintenanceDate?: string;
  nextMaintenanceMileage?: number;
  profitability?: VehicleProfitability;
}

export interface ExtraItem {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  iconName: string;
  category: 'EQUIPMENT' | 'INSURANCE' | 'SERVICE';
}

// Section 12 & 18: Centralized Booking Domain & Pricing
export interface BookingPricingBreakdown {
  durationDays: number;
  baseDailyRate: number;
  rentalSubtotal: number;
  seasonalMultiplier: number;
  weekendMultiplier: number;
  extrasTotal: number;
  insuranceTotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  depositAmount: number;
  currency: 'TND' | 'EUR';
}

export interface Booking {
  id: string;
  bookingNumber: string; // e.g., "AR-2026-1029"
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  vehicleImageUrl: string;
  agencyId: string;
  startDate: string; // ISO String or YYYY-MM-DD
  endDate: string; // ISO String or YYYY-MM-DD
  startTime: string; // "10:00"
  endTime: string; // "18:00"
  dailyRate: number;
  durationDays: number;
  includedKm: number; // e.g. 250km/day or unlimited
  selectedExtras: string[]; // Extra IDs
  extrasTotal: number;
  rentalSubtotal: number;
  discountAmount?: number;
  tax: number;
  totalAmount: number;
  depositAmount: number;
  depositStatus?: 'NON_ENCAISSEE' | 'ENCAISSEE' | 'RESTITUEE';
  paidAmount?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  pickupLocation?: string;
  returnLocation?: string;
  hasGps?: boolean;
  hasChildSeat?: boolean;
  hasExtraDriver?: boolean;
  hasFullInsurance?: boolean;
  agreementSigned?: boolean;
  agreementSignatureUrl?: string;
  signedAt?: string;
  checkInId?: string;
  checkOutId?: string;
  invoiceNumber?: string;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationFee?: number;
  refundAmount?: number;
  createdAt: string;
  updatedAt?: string;
}

// Section 21: Check-In / Check-Out 6-point capture
export interface MandatoryPhotos {
  front: string;
  rear: string;
  left: string;
  right: string;
  interior: string;
  dashboard: string;
}

export interface LicenseOcrResult {
  number: string;
  fullName: string;
  expiryDate: string;
  category: string;
  isValid: boolean;
  confidence: number;
}

export interface CheckIn {
  id: string;
  bookingId: string;
  bookingNumber: string;
  vehicleId: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  mileage: number;
  fuelLevel: number; // 0-100%
  photos: MandatoryPhotos;
  licensePhotoUrl: string;
  licenseOcrData?: LicenseOcrResult;
  damages: DamageItem[];
  signatureDataUrl: string;
  depositCollected: number;
  depositPaymentMethod: 'STRIPE_CARD' | 'CASH' | 'CHEQUE';
  notes?: string;
}

export interface CheckOut {
  id: string;
  bookingId: string;
  bookingNumber: string;
  vehicleId: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  mileage: number;
  startMileage: number;
  extraKm: number;
  extraKmCost: number;
  fuelLevel: number;
  startFuelLevel: number;
  missingFuelPercentage: number;
  missingFuelCost: number;
  photos: MandatoryPhotos;
  newDamages: DamageItem[];
  damageCost: number;
  totalSurcharges: number;
  depositRefundAmount: number;
  signatureDataUrl: string;
  dischargeAgreed: boolean;
  notes?: string;
}

// Section 25 & 26: Payments & Invoices
export interface Payment {
  id: string;
  bookingId: string;
  bookingNumber?: string;
  invoiceId?: string;
  clientId: string;
  clientName?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  createdAt: string;
  processedBy?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-AR-2026-0042"
  bookingId: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  vehicleInfo: string;
  agencyName: string;
  agencyAddress: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number; // 19% standard VAT in Tunisia or 7% transport
  taxAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status?: InvoiceStatus;
}

// Section 27: Operational Audit Activity Logs
export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  details: string;
  targetType: 'BOOKING' | 'VEHICLE' | 'CLIENT' | 'PAYMENT' | 'INVOICE' | 'MAINTENANCE' | 'USER' | 'SYSTEM';
  targetId: string;
  amountBefore?: number;
  amountAfter?: number;
}

export interface AppNotification {
  id: string;
  type: 
    | 'CHECKIN_DUE' 
    | 'CHECKOUT_DUE' 
    | 'LICENSE_EXPIRING' 
    | 'MAINTENANCE_DUE' 
    | 'NEW_BOOKING' 
    | 'OVERDUE_RETURN' 
    | 'FLEET_ALERT' 
    | 'INSPECTION_ALERT'
    | 'UNPAID_INVOICE'
    | 'EXTENSION_REQUEST';
  title: string;
  message: string;
  time: string;
  read: boolean;
  targetId?: string;
  severity: 'INFO' | 'WARNING' | 'ALERT';
}
