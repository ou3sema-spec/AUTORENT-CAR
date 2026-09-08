import { Vehicle, VehicleStatus, VehicleProfitability, Booking, MaintenanceRecord } from '../types';
import { setFirestoreDoc, deleteFirestoreDoc } from '../lib/firebase';
import { logActivity } from './audit.service';
import { canTransitionVehicle } from '../features/bookings/booking-state';

export class VehiclesService {
  /**
   * Calculates profitability metrics for a vehicle based on its bookings and maintenance
   */
  static calculateProfitability(
    vehicle: Vehicle,
    bookings: Booking[],
    maintenances: MaintenanceRecord[]
  ): VehicleProfitability {
    const vehicleBookings = bookings.filter(
      (b) => b.vehicleId === vehicle.id && b.status !== 'CANCELLED'
    );

    const totalRevenue = vehicleBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalRentalDays = vehicleBookings.reduce((sum, b) => sum + (b.durationDays || 1), 0);

    const vehicleMaintenances = maintenances.filter(
      (m) => m.vehicleId === vehicle.id && m.status !== 'CANCELLED'
    );
    const maintenanceCost = vehicleMaintenances.reduce((sum, m) => sum + (m.cost || 0), 0);

    // Approximate insurance at 450 DT / year (~1.23 DT/day)
    const insuranceCost = 450;
    const otherExpenses = Math.round(totalRevenue * 0.05); // 5% cleaning/misc

    const netContribution = Math.round((totalRevenue - maintenanceCost - insuranceCost - otherExpenses) * 100) / 100;
    
    // Utilization over 90 days window
    const windowDays = 90;
    const utilizationRate = Math.min(100, Math.round((totalRentalDays / windowDays) * 100));
    const revenuePerAvailableDay = Math.round((totalRevenue / windowDays) * 100) / 100;
    const costPerKilometer = vehicle.mileage > 0 ? Math.round((maintenanceCost / vehicle.mileage) * 1000) / 1000 : 0.045;
    const averageRentalValue = vehicleBookings.length > 0 ? Math.round(totalRevenue / vehicleBookings.length) : vehicle.dailyRate * 3;

    return {
      totalRevenue,
      maintenanceCost,
      insuranceCost,
      otherExpenses,
      netContribution,
      utilizationRate,
      revenuePerAvailableDay,
      costPerKilometer,
      averageRentalValue,
      totalRentalDays,
    };
  }

  static async updateVehicleStatus(
    vehicle: Vehicle,
    newStatus: VehicleStatus,
    actor = 'Agent Flotte'
  ): Promise<{ success: boolean; error?: string }> {
    if (!canTransitionVehicle(vehicle.status, newStatus)) {
      return {
        success: false,
        error: `Transition de statut invalide pour le véhicule ${vehicle.plate}: ${vehicle.status} → ${newStatus}`,
      };
    }

    const updated: Vehicle = {
      ...vehicle,
      status: newStatus,
    };

    await setFirestoreDoc('vehicles', vehicle.id, updated);
    await logActivity(
      actor,
      'FLEET',
      'VEHICLE_STATUS_CHANGE',
      `Statut du véhicule ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) changé en ${newStatus}`,
      'VEHICLE',
      vehicle.id
    );

    return { success: true };
  }

  static async saveVehicle(
    vehicle: Vehicle,
    actor = 'Agent Flotte'
  ): Promise<{ success: boolean; error?: string }> {
    await setFirestoreDoc('vehicles', vehicle.id, vehicle);
    await logActivity(
      actor,
      'FLEET',
      'SAVE_VEHICLE',
      `Fiche véhicule enregistrée : ${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
      'VEHICLE',
      vehicle.id
    );
    return { success: true };
  }

  static async deleteVehicle(
    vehicleId: string,
    plate: string,
    actor = 'Admin'
  ): Promise<{ success: boolean; error?: string }> {
    await deleteFirestoreDoc('vehicles', vehicleId);
    await logActivity(
      actor,
      'ADMIN',
      'DELETE_VEHICLE',
      `Véhicule supprimé de la flotte (${plate})`,
      'VEHICLE',
      vehicleId
    );
    return { success: true };
  }
}
