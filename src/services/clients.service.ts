import { Client } from '../types';
import { setFirestoreDoc, deleteFirestoreDoc } from '../lib/firebase';
import { logActivity } from './audit.service';

export class ClientsService {
  static async saveClient(client: Client, actor = 'Agent'): Promise<{ success: boolean; client: Client }> {
    const id = client.id || `client-${Date.now()}`;
    const payload: Client = {
      ...client,
      id,
      createdAt: client.createdAt || new Date().toISOString(),
    };

    await setFirestoreDoc('clients', id, payload);
    await logActivity(
      actor,
      'AGENT',
      'SAVE_CLIENT',
      `Fiche client enregistrée : ${payload.firstName} ${payload.lastName} (${payload.email})`,
      'CLIENT',
      id
    );

    return { success: true, client: payload };
  }

  static async deleteClient(clientId: string, clientName: string, actor = 'Admin'): Promise<{ success: boolean }> {
    await deleteFirestoreDoc('clients', clientId);
    await logActivity(
      actor,
      'ADMIN',
      'DELETE_CLIENT',
      `Client supprimé : ${clientName}`,
      'CLIENT',
      clientId
    );
    return { success: true };
  }
}
