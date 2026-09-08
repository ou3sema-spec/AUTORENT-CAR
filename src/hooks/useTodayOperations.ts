import { useEffect, useState, useCallback } from 'react';
import { useBookings } from '../context/BookingContext';
import { Booking } from '../types';

/**
 * Hook for managing "Opérations Prioritaires du Jour" (Today's Priority Operations)
 * Filters bookings for today and syncs with notifications
 */

export interface TodayOperations {
  checkIns: Booking[];
  checkOuts: Booking[];
  overdue: Booking[];
  allTodayBookings: Booking[];
  isLoading: boolean;
  refreshOperations: () => void;
}

export function useTodayOperations(): TodayOperations {
  const { bookings } = useBookings();
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getTodayDate = useCallback((): Date => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }, []);

  const filterTodayBookings = useCallback(() => {
    setIsLoading(true);
    try {
      const today = getTodayDate();
      const todayTime = today.getTime();

      const filtered = bookings.filter((booking) => {
        const checkInDate = new Date(booking.startDate);
        const checkOutDate = new Date(booking.endDate);
        
        // Normalize dates to start of day for comparison
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

        // Include bookings that have check-in or check-out TODAY
        return checkInDay === todayTime || checkOutDay === todayTime;
      });

      setTodayBookings(filtered);
    } catch (error) {
      console.error('Error filtering today bookings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [bookings, getTodayDate]);

  const getCheckIns = useCallback((): Booking[] => {
    const today = getTodayDate();
    return todayBookings.filter((booking) => {
      const checkInDate = new Date(booking.startDate);
      const checkInDay = new Date(
        checkInDate.getFullYear(),
        checkInDate.getMonth(),
        checkInDate.getDate()
      );
      return checkInDay.getTime() === today.getTime();
    });
  }, [todayBookings, getTodayDate]);

  const getCheckOuts = useCallback((): Booking[] => {
    const today = getTodayDate();
    return todayBookings.filter((booking) => {
      const checkOutDate = new Date(booking.endDate);
      const checkOutDay = new Date(
        checkOutDate.getFullYear(),
        checkOutDate.getMonth(),
        checkOutDate.getDate()
      );
      return checkOutDay.getTime() === today.getTime();
    });
  }, [todayBookings, getTodayDate]);

  const getOverdue = useCallback((): Booking[] => {
    const now = new Date();
    return todayBookings.filter((booking) => {
      const checkOutDate = new Date(booking.endDate);
      return (
        booking.status !== 'COMPLETED' &&
        booking.status !== 'CANCELLED' &&
        checkOutDate < now
      );
    });
  }, [todayBookings]);

  const refreshOperations = useCallback(() => {
    filterTodayBookings();
  }, [filterTodayBookings]);

  useEffect(() => {
    filterTodayBookings();
  }, [filterTodayBookings]);

  return {
    checkIns: getCheckIns(),
    checkOuts: getCheckOuts(),
    overdue: getOverdue(),
    allTodayBookings: todayBookings,
    isLoading,
    refreshOperations,
  };
}

/**
 * Hook for syncing booking notifications with today's operations
 */
export function useTodayNotifications() {
  const { allTodayBookings } = useTodayOperations();
  const [notificationsSent, setNotificationsSent] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const sendNotifications = async () => {
      try {
        const { scheduleBookingNotifications } = await import(
          '../services/notification.service'
        );
        await scheduleBookingNotifications(allTodayBookings);
      } catch (error) {
        console.error('Error scheduling notifications:', error);
      }
    };

    if (allTodayBookings.length > 0) {
      sendNotifications();
    }
  }, [allTodayBookings]);

  return { notificationsSent };
}
