import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase.config';
import { Booking } from '../types';

/**
 * FCM Notification Service
 * Handles push notifications for check-in/check-out reminders
 */

const messaging = getMessaging(app);

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, string>;
}

/**
 * Request user permission for push notifications
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      console.log('FCM Token:', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

/**
 * Register FCM token in Firestore for a user
 */
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase.config');
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: [token],
      lastTokenUpdate: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}

/**
 * Listen to incoming FCM messages
 */
export function setupMessageListener(callback: (payload: any) => void): void {
  onMessage(messaging, (payload) => {
    console.log('Message received:', payload);
    callback(payload);
    
    // Show browser notification
    if (payload.notification) {
      const notificationOptions: NotificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/autorent-logo.png',
        badge: payload.notification.badge || '/autorent-badge.png',
        tag: payload.notification.tag || 'autorent-notification',
        data: payload.data,
      };
      
      new Notification(payload.notification.title, notificationOptions);
    }
  });
}

/**
 * Send check-in reminder notification
 */
export async function sendCheckInReminder(booking: Booking): Promise<void> {
  try {
    const checkInTime = new Date(booking.checkInDate);
    const now = new Date();
    const timeUntilCheckIn = checkInTime.getTime() - now.getTime();
    
    // Send notification 2 hours before check-in
    const reminderTime = 2 * 60 * 60 * 1000;
    
    if (timeUntilCheckIn > 0 && timeUntilCheckIn <= reminderTime) {
      const payload: NotificationPayload = {
        title: '⏰ Rappel Check-in AUTORENT',
        body: `Votre véhicule ${booking.vehicleName} sera disponible pour retrait à ${checkInTime.toLocaleTimeString('fr-TN')}. Veuillez confirmer votre présence.`,
        icon: '/autorent-logo.png',
        badge: '/autorent-badge.png',
        tag: `checkin-${booking.id}`,
        data: {
          bookingId: booking.id,
          type: 'check-in-reminder',
          vehicleId: booking.vehicleId,
        },
      };
      
      // Send via backend API
      await sendPushNotification(booking.clientId, payload);
    }
  } catch (error) {
    console.error('Error sending check-in reminder:', error);
  }
}

/**
 * Send check-out reminder notification
 */
export async function sendCheckOutReminder(booking: Booking): Promise<void> {
  try {
    const checkOutTime = new Date(booking.checkOutDate);
    const now = new Date();
    const timeUntilCheckOut = checkOutTime.getTime() - now.getTime();
    
    // Send notification 24 hours before check-out
    const reminderTime = 24 * 60 * 60 * 1000;
    
    if (timeUntilCheckOut > 0 && timeUntilCheckOut <= reminderTime) {
      const payload: NotificationPayload = {
        title: '⏰ Rappel Restitution AUTORENT',
        body: `Veuillez restituer ${booking.vehicleName} avant ${checkOutTime.toLocaleTimeString('fr-TN')}. Frais supplémentaires appliqués si retard.`,
        icon: '/autorent-logo.png',
        badge: '/autorent-badge.png',
        tag: `checkout-${booking.id}`,
        data: {
          bookingId: booking.id,
          type: 'check-out-reminder',
          vehicleId: booking.vehicleId,
        },
      };
      
      // Send via backend API
      await sendPushNotification(booking.clientId, payload);
    }
  } catch (error) {
    console.error('Error sending check-out reminder:', error);
  }
}

/**
 * Send custom push notification via backend
 */
export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        ...payload,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Schedule notifications for all active bookings
 */
export async function scheduleBookingNotifications(bookings: Booking[]): Promise<void> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  for (const booking of bookings) {
    const checkInDate = new Date(booking.checkInDate);
    const checkOutDate = new Date(booking.checkOutDate);
    const checkInDay = new Date(
      checkInDate.getFullYear(),
      checkInDate.getMonth(),
      checkInDate.getDate()
    );
    const checkOutDay = new Date(
      checkOutDate.getFullYear(),
      checkOutDate.getMonth(),
      checkOutDate.getDate()
    );
    
    // Send reminders for today's bookings
    if (checkInDay.getTime() === today.getTime()) {
      await sendCheckInReminder(booking);
    }
    
    if (checkOutDay.getTime() === today.getTime()) {
      await sendCheckOutReminder(booking);
    }
  }
}
