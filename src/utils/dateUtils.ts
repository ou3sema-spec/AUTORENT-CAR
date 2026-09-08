/**
 * Date utility functions for AUTORENT operations
 * Handles date normalization and comparisons for bookings
 */

/**
 * Normalize a date to start of day (00:00:00)
 */
export function normalizeToStartOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Normalize a date to end of day (23:59:59)
 */
export function normalizeToEndOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return new Date(endOfDay.getTime() - 1);
}

/**
 * Get today's date normalized to start of day
 */
export function getTodayStart(): Date {
  const today = new Date();
  return normalizeToStartOfDay(today);
}

/**
 * Get today's date normalized to end of day
 */
export function getTodayEnd(): Date {
  const today = new Date();
  return normalizeToEndOfDay(today);
}

/**
 * Check if a date falls on today
 */
export function isToday(date: Date | string): boolean {
  const d = normalizeToStartOfDay(date);
  const today = getTodayStart();
  return d.getTime() === today.getTime();
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return d < new Date();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return d > new Date();
}

/**
 * Format time as HH:MM (Tunisian locale)
 */
export function formatTime(date: Date | string, locale: string = 'fr-TN'): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date as DD/MM/YYYY (Tunisian locale)
 */
export function formatDate(date: Date | string, locale: string = 'fr-TN'): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date and time (Tunisian locale)
 */
export function formatDateTime(date: Date | string, locale: string = 'fr-TN'): string {
  return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
}

/**
 * Get days difference between two dates
 */
export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : new Date(date1);
  const d2 = typeof date2 === 'string' ? new Date(date2) : new Date(date2);
  
  const normalizedD1 = normalizeToStartOfDay(d1);
  const normalizedD2 = normalizeToStartOfDay(d2);
  
  const diffTime = Math.abs(normalizedD2.getTime() - normalizedD1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get hours difference between two dates
 */
export function getHoursDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : new Date(date1);
  const d2 = typeof date2 === 'string' ? new Date(date2) : new Date(date2);
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60));
}

/**
 * Check if booking is today (has check-in or check-out today)
 */
export function isBookingToday(checkInDate: Date | string, checkOutDate: Date | string): boolean {
  const today = getTodayStart();
  const checkInDay = normalizeToStartOfDay(checkInDate);
  const checkOutDay = normalizeToStartOfDay(checkOutDate);
  
  return checkInDay.getTime() === today.getTime() || checkOutDay.getTime() === today.getTime();
}

/**
 * Check if booking has check-in today
 */
export function hasCheckInToday(checkInDate: Date | string): boolean {
  return isToday(checkInDate);
}

/**
 * Check if booking has check-out today
 */
export function hasCheckOutToday(checkOutDate: Date | string): boolean {
  return isToday(checkOutDate);
}

/**
 * Get booking status color for UI
 */
export function getBookingStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800 border-green-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    checked_in: 'bg-blue-100 text-blue-800 border-blue-300',
    checked_out: 'bg-gray-100 text-gray-800 border-gray-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Sort bookings by time
 */
export function sortBookingsByTime(bookings: any[], dateField: 'checkInDate' | 'checkOutDate' = 'checkInDate'): any[] {
  return [...bookings].sort((a, b) => {
    const dateA = new Date(a[dateField]);
    const dateB = new Date(b[dateField]);
    return dateA.getTime() - dateB.getTime();
  });
}
