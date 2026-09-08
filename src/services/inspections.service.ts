import { CheckIn, CheckOut, DamageRecord, DamageItem, Vehicle, Booking, DamageStatus } from '../types';
import { setFirestoreDoc } from '../lib/firebase';
import { logActivity } from './audit.service';
import { getNextVehicleStatusAfterInspection } from '../features/bookings/booking-state';

export interface InspectionComparison {
  mileageDifference: number;
  fuelDifferencePercent: number;
  newDamagesDetected: DamageItem[];
  extraKmDriven: number;
  extraKmCost: number;
  missingFuelCost: number;
  totalDamageCost: number;
  damageCost?: number;
  totalDue: number;
}

export class InspectionsService {
  /**
   * Record Check-In (Departure Inspection)
   */
  static async recordCheckIn(
    checkInData: CheckIn,
    vehicle: Vehicle,
    booking: Booking,
    actor = 'Agent Technique'
  ): Promise<{ success: boolean; checkIn: CheckIn }> {
    await setFirestoreDoc('checkIns', checkInData.id, checkInData);

    // Update vehicle mileage and current fuel level, and status to RENTED
    await setFirestoreDoc('vehicles', vehicle.id, {
      ...vehicle,
      mileage: checkInData.mileage,
      currentFuelLevel: checkInData.fuelLevel,
      status: 'RENTED',
    });

    // Update booking status to ACTIVE / CHECKED_IN
    await setFirestoreDoc('bookings', booking.id, {
      ...booking,
      checkInId: checkInData.id,
      status: 'ACTIVE',
    });

    await logActivity(
      actor,
      'AGENT',
      'CHECK_IN',
      `Départ véhicule ${vehicle.plate} validé pour contrat #${booking.bookingNumber} (${checkInData.mileage} km, ${checkInData.fuelLevel}% carburant)`,
      'VEHICLE',
      vehicle.id
    );

    return { success: true, checkIn: checkInData };
  }

  /**
   * Record Check-Out (Return Inspection) and compare with Departure Check-In
   */
  static async recordCheckOut(
    checkOutData: CheckOut,
    checkInData: CheckIn | undefined,
    vehicle: Vehicle,
    booking: Booking,
    actor = 'Agent Technique'
  ): Promise<{ success: boolean; checkOut: CheckOut; comparison: InspectionComparison }> {
    await setFirestoreDoc('checkOuts', checkOutData.id, checkOutData);

    const startKm = checkInData ? checkInData.mileage : (vehicle.mileage - (checkOutData.extraKm || 0));
    const startFuel = checkInData ? checkInData.fuelLevel : 100;

    const mileageDiff = Math.max(0, checkOutData.mileage - startKm);
    const fuelDiff = Math.max(0, startFuel - checkOutData.fuelLevel);

    const extraKmCost = checkOutData.extraKmCost || 0;
    const missingFuelCost = checkOutData.missingFuelCost || 0;
    const damageCost = checkOutData.damageCost || 0;
    const totalDue = extraKmCost + missingFuelCost + damageCost;

    const hasDamage = checkOutData.newDamages && checkOutData.newDamages.length > 0;
    const nextVehicleStatus = getNextVehicleStatusAfterInspection(hasDamage);

    // If new damages detected, save structured damage records
    if (hasDamage) {
      for (const d of checkOutData.newDamages) {
        const damageRecordId = `dmg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const record: DamageRecord = {
          id: damageRecordId,
          vehicleId: vehicle.id,
          bookingId: booking.id,
          inspectionId: checkOutData.id,
          location: d.zone,
          description: d.description,
          severity: d.severity,
          photos: d.photoUrl ? [d.photoUrl] : [],
          createdBy: actor,
          createdAt: new Date().toISOString(),
          repairCost: d.estimatedCost || 0,
          status: 'OPEN',
        };
        await setFirestoreDoc('damageRecords', damageRecordId, record);
      }
    }

    // Update vehicle status
    await setFirestoreDoc('vehicles', vehicle.id, {
      ...vehicle,
      mileage: checkOutData.mileage,
      currentFuelLevel: checkOutData.fuelLevel,
      status: nextVehicleStatus,
      damages: [...(vehicle.damages || []), ...(checkOutData.newDamages || [])],
    });

    // Update booking status to RETURNED / COMPLETED
    await setFirestoreDoc('bookings', booking.id, {
      ...booking,
      checkOutId: checkOutData.id,
      status: 'RETURNED',
    });

    await logActivity(
      actor,
      'AGENT',
      'CHECK_OUT',
      `Restitution véhicule ${vehicle.plate} pour contrat #${booking.bookingNumber}. Statut véhicule: ${nextVehicleStatus}${hasDamage ? ` (${checkOutData.newDamages.length} nouveaux dommages)` : ' (Aucun dommage)'}`,
      'VEHICLE',
      vehicle.id
    );

    const comparison: InspectionComparison = {
      mileageDifference: mileageDiff,
      fuelDifferencePercent: fuelDiff,
      newDamagesDetected: checkOutData.newDamages || [],
      extraKmDriven: checkOutData.extraKm || 0,
      extraKmCost,
      missingFuelCost,
      damageCost,
      totalDamageCost: damageCost,
      totalDue,
    };

    return { success: true, checkOut: checkOutData, comparison };
  }

  /**
   * Update damage record status
   */
  static async updateDamageStatus(
    damageId: string,
    newStatus: DamageStatus,
    repairCost?: number,
    actor = 'Agent Technique'
  ): Promise<{ success: boolean }> {
    const updates: Partial<DamageRecord> = {
      status: newStatus,
      ...(newStatus === 'RESOLVED' ? { resolvedAt: new Date().toISOString() } : {}),
      ...(repairCost !== undefined ? { repairCost } : {}),
    };

    await setFirestoreDoc('damageRecords', damageId, updates);
    await logActivity(
      actor,
      'FLEET',
      'UPDATE_DAMAGE_STATUS',
      `Dossier dommage #${damageId} mis à jour : statut ${newStatus}`,
      'VEHICLE',
      damageId
    );
    return { success: true };
  }
}
