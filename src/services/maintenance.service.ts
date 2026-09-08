import { MaintenanceRecord, Vehicle } from '../types';
import { setFirestoreDoc, deleteFirestoreDoc } from '../lib/firebase';
import { logActivity } from './audit.service';

export class MaintenanceService {
  static async scheduleMaintenance(
    record: Omit<MaintenanceRecord, 'id'>,
    vehicle: Vehicle,
    actor = 'Gestionnaire Parc'
  ): Promise<{ success: boolean; maintenance: MaintenanceRecord }> {
    const id = `maint-${Date.now()}`;
    const payload: MaintenanceRecord = {
      ...record,
      id,
    };

    await setFirestoreDoc('maintenances', id, payload);

    // If maintenance is in progress, update vehicle status to MAINTENANCE
    if (payload.status === 'IN_PROGRESS') {
      await setFirestoreDoc('vehicles', vehicle.id, {
        ...vehicle,
        status: 'MAINTENANCE',
      });
    }

    await logActivity(
      actor,
      'FLEET',
      'SCHEDULE_MAINTENANCE',
      `Intervention programmée : ${payload.title} pour ${vehicle.plate} (${payload.cost} DT)`,
      'MAINTENANCE',
      id,
      undefined,
      payload.cost
    );

    return { success: true, maintenance: payload };
  }

  static async completeMaintenance(
    maintenance: MaintenanceRecord,
    vehicle: Vehicle,
    actualCost?: number,
    actor = 'Gestionnaire Parc'
  ): Promise<{ success: boolean }> {
    const updated: MaintenanceRecord = {
      ...maintenance,
      status: 'COMPLETED',
      cost: actualCost !== undefined ? actualCost : maintenance.cost,
    };

    await setFirestoreDoc('maintenances', maintenance.id, updated);

    // Free vehicle back to AVAILABLE if it was in MAINTENANCE
    if (vehicle.status === 'MAINTENANCE') {
      await setFirestoreDoc('vehicles', vehicle.id, {
        ...vehicle,
        status: 'AVAILABLE',
      });
    }

    await logActivity(
      actor,
      'FLEET',
      'COMPLETE_MAINTENANCE',
      `Maintenance terminée : ${maintenance.title} pour ${vehicle.plate}. Véhicule remis en disponibilité.`,
      'MAINTENANCE',
      maintenance.id
    );

    return { success: true };
  }
}
