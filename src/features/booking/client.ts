import {
  addBooking, calendarDate, cancelBooking, isAvailable, isBooking, offeredSlots,
  services, time, upcomingDays, type Booking, type ServiceId,
} from './model';
import { mountTelegram, readyTelegram, syncTelegramBack } from '../telegram/adapter';

const storageKey = 'portfolio:bike-booking:v1';
const dateFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' });
const weekdayFormat = new Intl.DateTimeFormat('ru', { weekday: 'short' });
const monthFormat = new Intl.DateTimeFormat('ru', { month: 'short' });
const elements = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const days = elements('[data-days]')!;
const slots = elements('[data-slots]')!;
const confirm = elements<HTMLButtonElement>('[data-confirm]')!;
const notice = elements('[data-notice]')!;
const openPanel = elements<HTMLButtonElement>('[data-open-panel]')!;
const records = elements('[data-bookings]')!;
const events = elements('[data-events]')!;

let browserStorage = true;
let bookings: Booking[] = [];
let service: ServiceId = 'inspection';
let date = upcomingDays(new Date())[0].key;
let minute: number | undefined;
let activeView: 'booking' | 'manage' = 'booking';

function readBookings() {
  if (!browserStorage) return bookings;
  try {
    const entries: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(entries) ? entries.filter(isBooking) : [];
  } catch {
    return bookings;
  }
}

function saveBookings(next: Booking[]) {
  bookings = next;
  if (!browserStorage) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(bookings));
  } catch {
    browserStorage = false;
  }
}

function writeState(edit: (latest: Booking[]) => Booking[] | undefined) {
  const apply = () => {
    bookings = readBookings();
    const next = edit(bookings);
    if (!next) return false;
    saveBookings(next);
    return true;
  };
  return navigator.locks ? navigator.locks.request(storageKey, apply) : Promise.resolve(apply());
}

function text(selector: string, value: string) {
  elements(selector)!.textContent = value;
}

function button(label: string, className: string) {
  const control = document.createElement('button');
  control.type = 'button';
  control.textContent = label;
  control.className = className;
  return control;
}

function showNotice(message?: string, success = false) {
  notice.textContent = message ?? '';
  notice.hidden = !message;
  openPanel.hidden = !success;
}

function renderSchedule() {
  const now = new Date();
  const calendar = upcomingDays(now);
  if (!calendar.some(({ key }) => key === date)) {
    date = calendar[0].key;
    minute = undefined;
  }
  if (minute !== undefined && !isAvailable({ service, date, minute }, bookings, now)) minute = undefined;
  days.replaceChildren(...calendar.map(({ key, date: day }) => {
    const control = button('', 'day');
    control.dataset.date = key;
    control.setAttribute('aria-label', weekdayFormat.format(day) + ', ' + dateFormat.format(day));
    control.setAttribute('aria-pressed', String(key === date));
    const weekday = document.createElement('span');
    weekday.textContent = weekdayFormat.format(day);
    const label = document.createElement('strong');
    label.textContent = String(day.getDate());
    const month = document.createElement('span');
    month.textContent = monthFormat.format(day);
    control.append(weekday, label, month);
    return control;
  }));
  slots.replaceChildren(...offeredSlots(service).map((start) => {
    const control = button(time(start), 'slot');
    control.dataset.minute = String(start);
    control.disabled = !isAvailable({ service, date, minute: start }, bookings, now);
    control.setAttribute('aria-label', time(start) + (control.disabled ? ', занято' : ''));
    control.setAttribute('aria-pressed', String(start === minute));
    return control;
  }));
  for (const control of document.querySelectorAll<HTMLButtonElement>('[data-service]')) {
    control.setAttribute('aria-pressed', String(control.dataset.service === service));
  }
  text('[data-summary-service]', services[service].name);
  text('[data-summary-date]', dateFormat.format(calendarDate(date)));
  text('[data-summary-time]', minute === undefined ? 'Выберите время' : time(minute));
  text('[data-summary-duration]', services[service].duration + ' мин');
  confirm.disabled = minute === undefined;
}

function entry(name: string, metadata: string) {
  const item = document.createElement('li');
  const description = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = name;
  const detail = document.createElement('p');
  detail.textContent = metadata;
  description.append(title, detail);
  item.append(description);
  return item;
}

function appointmentLabel(booking: Booking) {
  return dateFormat.format(calendarDate(booking.date)) + ', ' + time(booking.minute);
}

function renderPanel() {
  const sorted = [...bookings].sort((left, right) => left.date.localeCompare(right.date) || left.minute - right.minute);
  records.replaceChildren(...sorted.map((booking) => {
    const cancelled = booking.cancelledAt !== undefined;
    const item = entry(services[booking.service].name, appointmentLabel(booking));
    const status = document.createElement('span');
    status.className = cancelled ? 'record-status cancelled' : 'record-status';
    status.textContent = cancelled ? 'Отменена' : 'Подтверждена';
    item.append(status);
    if (!cancelled) {
      const action = button('Отменить', 'subtle');
      action.dataset.cancel = booking.id;
      action.setAttribute('aria-label', 'Отменить запись ' + appointmentLabel(booking));
      item.append(action);
    }
    return item;
  }));
  const activity = bookings.flatMap((booking) => [
    { booking, action: 'Запись подтверждена', at: booking.createdAt },
    ...(booking.cancelledAt === undefined ? [] : [{ booking, action: 'Запись отменена', at: booking.cancelledAt }]),
  ]).sort((left, right) => right.at - left.at);
  events.replaceChildren(...activity.map(({ booking, action }) => entry(
    action, services[booking.service].name + ' · ' + appointmentLabel(booking),
  )));
  elements('[data-empty-bookings]')!.hidden = sorted.length > 0;
  elements('[data-empty-events]')!.hidden = activity.length > 0;
}

function show(view: 'booking' | 'manage') {
  activeView = view;
  for (const section of document.querySelectorAll<HTMLElement>('[data-screen]')) {
    section.hidden = section.dataset.screen !== view;
  }
  for (const control of document.querySelectorAll<HTMLElement>('[data-view]')) {
    control.setAttribute('aria-pressed', String(control.dataset.view === view));
  }
  bookings = readBookings();
  if (view === 'manage') renderPanel();
  else renderSchedule();
  syncTelegramBack(view === 'manage');
  window.scrollTo(0, 0);
  elements('#' + view + '-title')?.focus({ preventScroll: true });
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest('button');
  if (!control) return;
  if (control.dataset.view === 'booking' || control.dataset.view === 'manage') {
    show(control.dataset.view);
  } else if (control.dataset.service && Object.hasOwn(services, control.dataset.service)) {
    service = control.dataset.service as ServiceId;
    minute = undefined;
    showNotice();
    renderSchedule();
  } else if (control.dataset.date) {
    date = control.dataset.date;
    minute = undefined;
    showNotice();
    renderSchedule();
    days.querySelector<HTMLButtonElement>('[data-date="' + date + '"]')?.focus();
  } else if (control.dataset.minute && !control.disabled) {
    minute = Number(control.dataset.minute);
    showNotice();
    renderSchedule();
    slots.querySelector<HTMLButtonElement>('[data-minute="' + minute + '"]')?.focus();
  }
});

confirm.addEventListener('click', async () => {
  if (minute === undefined) return;
  confirm.disabled = true;
  const selection = { service, date, minute };
  try {
    const saved = await writeState((latest) => addBooking(latest, selection, crypto.randomUUID(), new Date()));
    if (saved) {
      minute = undefined;
      const message = browserStorage ? 'Запись подтверждена' : 'Запись подтверждена в этой вкладке';
      showNotice(message + '. ' + dateFormat.format(calendarDate(selection.date)) + ', ' + time(selection.minute) + '.', true);
    } else {
      showNotice('Этот слот уже недоступен. Выберите другое время.');
    }
  } catch {
    showNotice('Не удалось сохранить запись. Попробуйте ещё раз.');
  }
  renderSchedule();
});

openPanel.addEventListener('click', () => show('manage'));
records.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest<HTMLButtonElement>('[data-cancel]');
  const id = control?.dataset.cancel;
  if (!id || !control) return;
  control.disabled = true;
  try {
    const cancelled = await writeState((latest) => cancelBooking(latest, id, new Date()));
    renderPanel();
    text('[data-panel-status]', cancelled ? 'Запись отменена. Слот снова доступен.' : 'Эта запись уже отменена.');
  } catch {
    control.disabled = false;
    text('[data-panel-status]', 'Не удалось отменить запись. Попробуйте ещё раз.');
  }
});

window.addEventListener('storage', ({ key }) => {
  if (key !== storageKey && key !== null) return;
  bookings = readBookings();
  if (activeView === 'booking') renderSchedule();
  else renderPanel();
});

bookings = readBookings();
renderSchedule();
const launch = new URLSearchParams(location.hash.slice(1));
void mountTelegram(launch.has('tgWebAppPlatform'), () => show('booking')).then(() => {
  document.documentElement.dataset.bookingReady = 'true';
  syncTelegramBack(activeView === 'manage');
  readyTelegram();
});
