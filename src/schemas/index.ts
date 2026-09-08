import { z } from 'zod';

export const clientFormSchema = z.object({
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse e-mail invalide'),
  phone: z.string().min(8, 'Numéro de téléphone invalide (ex: +216 20 123 456)'),
  licenseNumber: z.string().min(4, 'Numéro de permis requis'),
  licenseExpiryDate: z.string().optional(),
  cinOrPassport: z.string().optional(),
  country: z.string().default('Tunisie'),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

export const vehicleFormSchema = z.object({
  brand: z.string().min(2, 'Marque requise'),
  model: z.string().min(1, 'Modèle requis'),
  plate: z.string().min(3, 'Immatriculation invalide (ex: 234 TUN 5678)'),
  category: z.enum(['CITADINE', 'COMPACTE', 'BERLINE', 'SUV', 'UTILITAIRE', 'PREMIUM', 'ELECTRIQUE']),
  year: z.number().min(2015).max(2030),
  mileage: z.number().min(0, 'Le kilométrage doit être positif'),
  dailyRate: z.number().min(1, 'Le tarif journalier doit être au moins 1 DT'),
  depositAmount: z.number().min(0, 'Le dépôt de garantie doit être positif'),
  fuelType: z.enum(['ESSENCE', 'DIESEL', 'HYBRIDE', 'ELECTRIQUE']),
  fuelCapacityLiters: z.number().min(1).default(50),
  currentFuelLevel: z.number().min(0).max(100).default(100),
  transmission: z.enum(['MANUELLE', 'AUTOMATIQUE']).default('MANUELLE'),
  status: z.enum(['AVAILABLE', 'RESERVED', 'PREPARING', 'RENTED', 'RETURNED', 'INSPECTION', 'MAINTENANCE', 'BLOCKED']).default('AVAILABLE'),
  agencyId: z.string().default('agency-tunis-carthage'),
  location: z.string().default('Aéroport Tunis-Carthage'),
});

export type VehicleFormData = z.infer<typeof vehicleFormSchema>;

export const bookingFormSchema = z
  .object({
    vehicleId: z.string().min(1, 'Veuillez sélectionner un véhicule'),
    clientId: z.string().min(1, 'Veuillez sélectionner ou créer un client'),
    startDate: z.string().min(1, 'Date de départ requise'),
    endDate: z.string().min(1, 'Date de retour requise'),
    startTime: z.string().default('10:00').optional(),
    endTime: z.string().default('10:00').optional(),
    pickupLocation: z.string().min(1, 'Lieu de prise en charge requis'),
    returnLocation: z.string().min(1, 'Lieu de restitution requis'),
    dailyRate: z.number().min(1, 'Le tarif journalier doit être supérieur à 0'),
    depositAmount: z.number().min(0, 'Le dépôt de garantie doit être positif'),
    insuranceTier: z.enum(['BASIC', 'STANDARD', 'PREMIUM']).default('STANDARD').optional(),
    hasGps: z.boolean().default(false).optional(),
    hasChildSeat: z.boolean().default(false).optional(),
    hasExtraDriver: z.boolean().default(false).optional(),
    hasFullInsurance: z.boolean().default(false).optional(),
    paymentMethod: z.enum(['STRIPE_CARD', 'CASH', 'TRANSFER', 'CHEQUE', 'ONLINE_TND']).default('CASH').optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      const start = new Date(`${data.startDate}T${data.startTime || '00:00'}`).getTime();
      const end = new Date(`${data.endDate}T${data.endTime || '00:00'}`).getTime();
      return end >= start;
    },
    {
      message: 'La date de retour doit être égale ou postérieure à la date de départ',
      path: ['endDate'],
    }
  );

export type BookingFormData = z.infer<typeof bookingFormSchema>;

export const paymentSchema = z.object({
  bookingId: z.string().min(1, 'ID de réservation requis'),
  clientId: z.string().min(1, 'ID de client requis'),
  amount: z.number().min(1, 'Le montant doit être supérieur à 0'),
  method: z.enum(['STRIPE_CARD', 'CASH', 'TRANSFER', 'CHEQUE', 'ONLINE_TND']),
  status: z.enum(['PENDING', 'AUTHORIZED', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'FAILED', 'CANCELLED']),
  currency: z.string().default('TND'),
  reference: z.string().optional(),
});

export type PaymentData = z.infer<typeof paymentSchema>;

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Numéro de facture requis'),
  bookingId: z.string().min(1, 'ID réservation requis'),
  clientId: z.string().min(1, 'ID client requis'),
  totalAmount: z.number().min(0),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0),
  status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID']),
  dueDate: z.string().min(1),
});

export type InvoiceData = z.infer<typeof invoiceSchema>;

export const maintenanceFormSchema = z.object({
  vehicleId: z.string().min(1, 'Véhicule requis'),
  type: z.enum(['VIDANGE', 'PLAQUETTES_FREIN', 'DISQUES_FREIN', 'PNEUMATIQUES', 'FILTRES', 'CONTROLE_TECHNIQUE', 'REVISION_GENERALE', 'CARROSSERIE', 'AUTRE']),
  title: z.string().min(3, "Description de l'intervention requise"),
  cost: z.number().min(0, 'Le coût doit être positif'),
  scheduledDate: z.string().min(1, 'Date requise'),
  serviceProvider: z.string().min(2, 'Prestataire / Garage requis'),
  notes: z.string().optional(),
});

export type MaintenanceFormData = z.infer<typeof maintenanceFormSchema>;

export const damageRecordSchema = z.object({
  vehicleId: z.string().min(1, 'Véhicule requis'),
  bookingId: z.string().optional(),
  location: z.string().min(2, 'Emplacement du dommage requis'),
  description: z.string().min(3, 'Description requise'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  repairCost: z.number().min(0).default(0),
  status: z.enum(['OPEN', 'ASSESSED', 'REPAIRING', 'RESOLVED', 'CHARGED_TO_CUSTOMER']).default('OPEN'),
});

export type DamageRecordData = z.infer<typeof damageRecordSchema>;

export const userProfileSchema = z.object({
  name: z.string().min(2, 'Nom complet requis'),
  email: z.string().email('Email valide requis'),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'FLEET', 'ACCOUNTANT', 'CUSTOMER']),
  agencyId: z.string().min(1, 'Agence requise'),
  pinCode: z.string().min(4).max(6),
  phone: z.string().optional(),
});

export type UserProfileData = z.infer<typeof userProfileSchema>;
