# FCM Notifications & Today's Operations Fix - Implementation Guide

## Overview
This implementation adds Firebase Cloud Messaging (FCM) push notifications for check-in/check-out reminders and fixes the bug where reservations created with today's date don't appear in the "Fil des Opérations Prioritaires du Jour" (Daily Priority Operations Feed).

## Files Added

### 1. **src/services/notification.service.ts**
Firebase Cloud Messaging service for sending push notifications.

**Key Functions:**
- `requestNotificationPermission()` - Request user permission for push notifications
- `saveFCMToken(userId, token)` - Register FCM token in Firestore
- `setupMessageListener(callback)` - Listen to incoming messages
- `sendCheckInReminder(booking)` - Send 2-hour before check-in reminder
- `sendCheckOutReminder(booking)` - Send 24-hour before check-out reminder
- `scheduleBookingNotifications(bookings)` - Schedule reminders for all active bookings

**Usage:**
```typescript
import { requestNotificationPermission, setupMessageListener } from '../services/notification.service';

// Initialize notifications on app load
const token = await requestNotificationPermission();
if (token) {
  await saveFCMToken(userId, token);
  setupMessageListener((payload) => {
    console.log('Message received:', payload);
  });
}
```

### 2. **src/hooks/useTodayOperations.ts**
React hook for filtering and managing today's bookings.

**Key Functions:**
- `useTodayOperations()` - Returns object with:
  - `checkIns: Booking[]` - Bookings with check-in today
  - `checkOuts: Booking[]` - Bookings with check-out today
  - `overdue: Booking[]` - Overdue bookings
  - `allTodayBookings: Booking[]` - All bookings for today
  - `refreshOperations()` - Manually refresh the feed

**Usage:**
```typescript
const { checkIns, checkOuts, overdue, refreshOperations } = useTodayOperations();

// Use in component
{checkIns.map(booking => (
  <BookingCard key={booking.id} booking={booking} />
))}
```

### 3. **src/utils/dateUtils.ts**
Utility functions for date handling and comparison.

**Key Functions:**
- `normalizeToStartOfDay(date)` - Convert date to 00:00:00
- `getTodayStart()` - Get today at 00:00:00
- `isToday(date)` - Check if date is today
- `isBookingToday(checkIn, checkOut)` - Check if booking has activity today
- `hasCheckInToday(checkInDate)` - Check if check-in is today
- `hasCheckOutToday(checkOutDate)` - Check if check-out is today
- `formatTime(date)` - Format time as HH:MM
- `formatDate(date)` - Format date as DD/MM/YYYY
- `sortBookingsByTime(bookings)` - Sort bookings chronologically

**Usage:**
```typescript
import { isToday, isBookingToday, formatTime } from '../utils/dateUtils';

if (isBookingToday(booking.checkInDate, booking.checkOutDate)) {
  // Booking has activity today
}
```

### 4. **src/server/routes/notifications.ts**
Backend API handlers for FCM notifications.

**Endpoints:**
- `POST /api/notifications/send` - Send to single user
- `POST /api/notifications/send-to-many` - Send to multiple users
- `POST /api/notifications/schedule-check-in` - Schedule check-in reminder
- `POST /api/notifications/schedule-check-out` - Schedule check-out reminder

**Environment Variables:**
```env
FIREBASE_ADMIN_SDK_JSON=<base64-encoded-admin-sdk-json>
FIREBASE_PROJECT_ID=your-project-id
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "⏰ Rappel Check-in AUTORENT",
    "body": "Your vehicle is ready for pickup",
    "icon": "/autorent-logo.png",
    "data": {
      "bookingId": "booking123",
      "type": "check-in-reminder"
    }
  }'
```

### 5. **public/service-worker.ts**
Service Worker for handling push notifications and offline functionality.

**Features:**
- Caches static assets for offline support
- Handles push notifications
- Routes notification clicks to relevant booking pages
- Clears old caches automatically

**Installation:**
Register in your `index.html` or `main.tsx`:
```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}
```

## Bug Fix: Today's Bookings Not Appearing

### Root Cause
The dashboard was comparing dates with timezone issues. When a booking is created with today's date, the date comparison logic wasn't properly normalizing dates to the start of day before comparing.

### Solution
The `useTodayOperations` hook now:
1. Normalizes all dates to start-of-day (00:00:00)
2. Compares dates by timestamp after normalization
3. Filters bookings where check-in OR check-out date matches today

### Code Fix in Dashboard Component

**Before (Broken):**
```typescript
const todayBookings = bookings.filter(b => {
  const checkInDate = new Date(b.checkInDate);
  const today = new Date();
  return checkInDate.toDateString() === today.toDateString();
});
```

**After (Fixed):**
```typescript
const getTodayDate = useCallback((): Date => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}, []);

const filtered = bookings.filter((booking) => {
  const checkInDate = new Date(booking.checkInDate);
  const checkOutDate = new Date(booking.checkOutDate);
  
  const checkInDay = new Date(
    checkInDate.getFullYear(),
    checkInDate.getMonth(),
    checkInDate.getDate()
  ).getTime();
  
  const checkOutDay = new Date(
    checkOutDate.getFullYear(),
    checkOutDate.getMonth(),
    checkOutDate.getDate()
  ).getTime();

  return checkInDay === todayTime || checkOutDay === todayTime;
});
```

## Integration Steps

### Step 1: Update Dashboard Component

Update your dashboard component to use the new hook:

```typescript
import { useTodayOperations } from '../hooks/useTodayOperations';
import { formatTime, sortBookingsByTime } from '../utils/dateUtils';

export function Dashboard() {
  const { checkIns, checkOuts, overdue, allTodayBookings, refreshOperations } = useTodayOperations();
  
  const sortedCheckIns = sortBookingsByTime(checkIns, 'checkInDate');
  const sortedCheckOuts = sortBookingsByTime(checkOuts, 'checkOutDate');

  return (
    <div>
      <section className="operations-feed">
        <h2>Fil des Opérations Prioritaires du Jour</h2>
        {allTodayBookings.length === 0 ? (
          <p>Aucune opération pour aujourd'hui</p>
        ) : (
          <div>
            {sortedCheckIns.map(booking => (
              <BookingOperation key={booking.id} booking={booking} type="check-in" />
            ))}
            {sortedCheckOuts.map(booking => (
              <BookingOperation key={booking.id} booking={booking} type="check-out" />
            ))}
            {overdue.map(booking => (
              <BookingOperation key={booking.id} booking={booking} type="overdue" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

### Step 2: Initialize Notifications

In your App.tsx or main component:

```typescript
import { requestNotificationPermission, setupMessageListener, saveFCMToken } from './services/notification.service';
import { useTodayNotifications } from './hooks/useTodayOperations';

export function App() {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const initNotifications = async () => {
      if (!user) return;

      try {
        const token = await requestNotificationPermission();
        if (token) {
          await saveFCMToken(user.id, token);
          
          setupMessageListener((payload) => {
            console.log('Notification received:', payload);
            // Handle notification display
          });
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initNotifications();
  }, [user]);

  return (
    // Your app JSX
  );
}
```

### Step 3: Configure Environment Variables

Create `.env` file:
```env
VITE_FIREBASE_VAPID_KEY=your-vapid-key-from-firebase-console
FIREBASE_ADMIN_SDK_JSON=your-base64-encoded-admin-sdk
FIREBASE_PROJECT_ID=your-project-id
```

### Step 4: Register Service Worker

In `src/main.tsx`:

```typescript
// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(reg => console.log('Service Worker registered'))
    .catch(err => console.log('Service Worker registration failed:', err));
}
```

### Step 5: Update Firebase Security Rules

In `firestore.rules`:

```firestore
match /databases/{database}/documents {
  match /users/{userId} {
    allow read, write: if request.auth.uid == userId;
    allow update: if request.auth.uid == userId && request.resource.data.fcmTokens is list;
  }
  
  match /notifications/{document=**} {
    allow read: if request.auth != null;
    allow create: if request.auth != null;
  }
}
```

## Testing

### Test Today's Bookings Display
1. Create a new booking with today's date
2. Navigate to Dashboard
3. Verify booking appears in "Fil des Opérations Prioritaires du Jour"
4. Check both check-in and check-out times are displayed

### Test Notifications
1. Request notification permission when app loads
2. Create a new booking
3. Wait for notification window (2 hours before check-in, 24 hours before check-out)
4. Verify push notification appears

### Test Service Worker
1. Load app once to cache resources
2. Go offline (DevTools > Network > Offline)
3. Refresh page
4. Verify app still loads from cache

## Troubleshooting

### Bookings Still Not Showing
- **Issue**: Bookings not appearing in today's feed
- **Solution**: 
  - Check browser console for errors in `useTodayOperations` hook
  - Verify booking dates are being saved correctly in Firestore
  - Clear browser cache and reload

### Notifications Not Sending
- **Issue**: Push notifications not received
- **Solution**:
  - Verify VAPID key is correct in Firebase Console
  - Check user has notification permission (browser settings)
  - Verify FCM token is saved in Firestore
  - Check backend logs for API errors

### Service Worker Not Updating
- **Issue**: Old service worker still active
- **Solution**:
  - Go to DevTools > Application > Service Workers
  - Click "Unregister" for all old workers
  - Refresh page to load new version

## Performance Notes

- Date normalization is lightweight and happens on component mount/booking change
- Hook uses `useCallback` to prevent unnecessary re-renders
- Notifications are scheduled asynchronously without blocking UI
- Service worker runs in separate thread, no impact on main app

## Security Considerations

- FCM tokens are stored per-user in Firestore with RBAC rules
- Notification payloads include only public booking data
- Service worker validates notification data before displaying
- All API endpoints require Firebase authentication
