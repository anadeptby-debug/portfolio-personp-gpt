export const services = {
  inspection: { name: 'Диагностика', description: 'Проверка рамы, колёс и основных узлов.', duration: 30 },
  brakes: { name: 'Настройка тормозов', description: 'Регулировка, проверка колодок и тест торможения.', duration: 45 },
  maintenance: { name: 'Полное обслуживание', description: 'Настройка трансмиссии и тормозов, протяжка креплений.', duration: 90 },
} as const;

export type ServiceId = keyof typeof services;
export type Selection = { service: ServiceId; date: string; minute: number };
export type Booking = Selection & { id: string; createdAt: number; cancelledAt?: number };

const starts = [600, 660, 720, 780, 840, 900, 960, 1020, 1080];
const closing = 19 * 60;
const twoDigits = (n: number) => String(n).padStart(2, '0');

export function localDay(date: Date) {
  return [date.getFullYear(), twoDigits(date.getMonth() + 1), twoDigits(date.getDate())].join('-');
}

export function calendarDate(day: string) {
  return new Date(day + 'T00:00:00');
}

export function upcomingDays(now: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index + 1);
    return { key: localDay(date), date };
  });
}

export function time(minute: number) {
  return twoDigits(Math.floor(minute / 60)) + ':' + twoDigits(minute % 60);
}

export function offeredSlots(service: ServiceId) {
  return starts.filter((minute) => minute + services[service].duration <= closing);
}

export function isAvailable(selection: Selection, bookings: readonly Booking[], now: Date) {
  const { service, date, minute } = selection;
  if (!offeredSlots(service).includes(minute)) return false;
  const start = new Date(date + 'T' + time(minute));
  if (Number.isNaN(start.valueOf()) || start <= now) return false;
  const end = minute + services[service].duration;
  return bookings.every((booking) => booking.cancelledAt !== undefined || booking.date !== date
    || minute >= booking.minute + services[booking.service].duration || end <= booking.minute);
}

export function addBooking(bookings: readonly Booking[], selection: Selection, id: string, now: Date) {
  if (!isAvailable(selection, bookings, now) || !upcomingDays(now).some(({ key }) => key === selection.date)) return;
  return [...bookings, { ...selection, id, createdAt: now.valueOf() }];
}

export function cancelBooking(bookings: readonly Booking[], id: string, now: Date) {
  const target = bookings.find((booking) => booking.id === id && booking.cancelledAt === undefined);
  if (!target) return;
  return bookings.map((booking) => booking.id === id ? { ...booking, cancelledAt: now.valueOf() } : booking);
}

export function isBooking(value: unknown): value is Booking {
  if (!value || typeof value !== 'object') return false;
  const booking = value as Partial<Booking>;
  return typeof booking.id === 'string' && typeof booking.service === 'string' && Object.hasOwn(services, booking.service)
    && typeof booking.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(booking.date)
    && !Number.isNaN(calendarDate(booking.date).valueOf())
    && typeof booking.minute === 'number' && offeredSlots(booking.service).includes(booking.minute)
    && Number.isFinite(booking.createdAt) && (booking.cancelledAt === undefined || Number.isFinite(booking.cancelledAt));
}
