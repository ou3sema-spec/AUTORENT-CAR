import { ActivityLog, UserRole } from '../types';
import { setFirestoreDoc } from '../lib/firebase';

export async function logActivity(
  actor: string,
  actorRole: UserRole,
  action: string,
  details: string,
  targetType: ActivityLog['targetType'],
  targetId: string,
  amountBefore?: number,
  amountAfter?: number
): Promise<void> {
  const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const logEntry: ActivityLog = {
    id: logId,
    timestamp: new Date().toISOString(),
    actor,
    actorRole,
    action,
    details,
    targetType,
    targetId,
    amountBefore,
    amountAfter,
  };

  try {
    await setFirestoreDoc('activityLogs', logId, logEntry);
  } catch (err) {
    console.warn('Failed to record activity log in Firestore (continuing locally):', err);
  }
}
