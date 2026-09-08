import express, { Request, Response } from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * FCM Notification Handler API
 * Sends push notifications via Firebase Cloud Messaging
 * 
 * Environment variables required:
 * - FIREBASE_ADMIN_SDK_JSON: Firebase Admin SDK JSON (base64 encoded)
 * - FIREBASE_PROJECT_ID: Firebase Project ID
 */

const router = express.Router();

// Initialize Firebase Admin
let messaging: any;
let db: any;

try {
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SDK_JSON;
  
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
    );
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    
    messaging = getMessaging();
    db = getFirestore();
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

interface SendNotificationRequest {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, string>;
}

/**
 * POST /api/notifications/send
 * Send push notification to a user
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, title, body, icon, badge, tag, data }: SendNotificationRequest = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        error: 'Missing required fields: userId, title, body',
      });
    }

    if (!messaging || !db) {
      return res.status(500).json({
        error: 'Firebase Admin not initialized',
      });
    }

    // Get user's FCM tokens from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const fcmTokens = userDoc.data()?.fcmTokens || [];

    if (fcmTokens.length === 0) {
      return res.status(400).json({
        error: 'User has no FCM tokens registered',
      });
    }

    const message = {
      notification: {
        title,
        body,
        imageUrl: icon,
      },
      webpush: {
        notification: {
          title,
          body,
          icon: icon || '/autorent-logo.png',
          badge: badge || '/autorent-badge.png',
          tag: tag || 'autorent-notification',
        },
        data,
      },
      data: data || {},
    };

    // Send to all tokens
    const results = await Promise.allSettled(
      fcmTokens.map((token: string) =>
        messaging.send({
          ...message,
          token,
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Log notification in Firestore
    await db.collection('notifications').add({
      userId,
      title,
      body,
      sentAt: new Date(),
      successCount: successful,
      failureCount: failed,
      tokens: fcmTokens.length,
    });

    res.json({
      success: true,
      message: `Notification sent to ${successful}/${fcmTokens.length} devices`,
      details: {
        total: fcmTokens.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/notifications/send-to-many
 * Send push notification to multiple users
 */
router.post('/send-to-many', async (req: Request, res: Response) => {
  try {
    const { userIds, title, body, icon, badge, tag, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || !title || !body) {
      return res.status(400).json({
        error: 'Missing required fields: userIds (array), title, body',
      });
    }

    if (!messaging || !db) {
      return res.status(500).json({
        error: 'Firebase Admin not initialized',
      });
    }

    const message = {
      notification: {
        title,
        body,
        imageUrl: icon,
      },
      webpush: {
        notification: {
          title,
          body,
          icon: icon || '/autorent-logo.png',
          badge: badge || '/autorent-badge.png',
          tag: tag || 'autorent-notification',
        },
        data,
      },
      data: data || {},
    };

    let totalSent = 0;
    let totalFailed = 0;

    for (const userId of userIds) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) continue;

        const fcmTokens = userDoc.data()?.fcmTokens || [];

        if (fcmTokens.length === 0) continue;

        const results = await Promise.allSettled(
          fcmTokens.map((token: string) =>
            messaging.send({
              ...message,
              token,
            })
          )
        );

        const successful = results.filter((r) => r.status === 'fulfilled').length;
        totalSent += successful;
        totalFailed += results.filter((r) => r.status === 'rejected').length;
      } catch (error) {
        console.error(`Error sending to user ${userId}:`, error);
        totalFailed++;
      }
    }

    res.json({
      success: true,
      message: `Notification sent to ${totalSent} devices across ${userIds.length} users`,
      details: {
        targetUsers: userIds.length,
        devicesSent: totalSent,
        devicesFailed: totalFailed,
      },
    });
  } catch (error) {
    console.error('Error sending bulk notification:', error);
    res.status(500).json({
      error: 'Failed to send notifications',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/notifications/schedule-check-in
 * Schedule check-in reminder for bookings today
 */
router.post('/schedule-check-in', async (req: Request, res: Response) => {
  try {
    const { bookingId, userId, vehicleName, checkInTime } = req.body;

    if (!bookingId || !userId || !vehicleName || !checkInTime) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    if (!messaging) {
      return res.status(500).json({
        error: 'Firebase Admin not initialized',
      });
    }

    const checkInDate = new Date(checkInTime);
    const timeStr = checkInDate.toLocaleTimeString('fr-TN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await messaging.sendToTopic(`booking-${bookingId}`, {
      notification: {
        title: '⏰ Rappel Check-in AUTORENT',
        body: `Votre véhicule ${vehicleName} sera disponible pour retrait à ${timeStr}. Veuillez confirmer votre présence.`,
      },
      data: {
        bookingId,
        type: 'check-in-reminder',
        vehicleName,
        timestamp: new Date().toISOString(),
      },
      webpush: {
        notification: {
          title: '⏰ Rappel Check-in AUTORENT',
          body: `Votre véhicule ${vehicleName} sera disponible pour retrait à ${timeStr}. Veuillez confirmer votre présence.`,
          icon: '/autorent-logo.png',
          badge: '/autorent-badge.png',
          tag: `checkin-${bookingId}`,
        },
      },
    });

    res.json({
      success: true,
      message: 'Check-in reminder scheduled',
    });
  } catch (error) {
    console.error('Error scheduling check-in reminder:', error);
    res.status(500).json({
      error: 'Failed to schedule check-in reminder',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/notifications/schedule-check-out
 * Schedule check-out reminder for bookings today
 */
router.post('/schedule-check-out', async (req: Request, res: Response) => {
  try {
    const { bookingId, userId, vehicleName, checkOutTime } = req.body;

    if (!bookingId || !userId || !vehicleName || !checkOutTime) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    if (!messaging) {
      return res.status(500).json({
        error: 'Firebase Admin not initialized',
      });
    }

    const checkOutDate = new Date(checkOutTime);
    const timeStr = checkOutDate.toLocaleTimeString('fr-TN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await messaging.sendToTopic(`booking-${bookingId}`, {
      notification: {
        title: '⏰ Rappel Restitution AUTORENT',
        body: `Veuillez restituer ${vehicleName} avant ${timeStr}. Frais supplémentaires appliqués si retard.`,
      },
      data: {
        bookingId,
        type: 'check-out-reminder',
        vehicleName,
        timestamp: new Date().toISOString(),
      },
      webpush: {
        notification: {
          title: '⏰ Rappel Restitution AUTORENT',
          body: `Veuillez restituer ${vehicleName} avant ${timeStr}. Frais supplémentaires appliqués si retard.`,
          icon: '/autorent-logo.png',
          badge: '/autorent-badge.png',
          tag: `checkout-${bookingId}`,
        },
      },
    });

    res.json({
      success: true,
      message: 'Check-out reminder scheduled',
    });
  } catch (error) {
    console.error('Error scheduling check-out reminder:', error);
    res.status(500).json({
      error: 'Failed to schedule check-out reminder',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
