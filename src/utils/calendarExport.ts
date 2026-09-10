import { CalendarEvent } from '../types';

export function generateIcsContent(event: CalendarEvent): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const dateParts = event.date.split('-').map(Number);
  const year = dateParts[0];
  const month = dateParts[1];
  const day = dateParts[2];

  let dtStart = '';
  let dtEnd = '';

  if (event.isAllDay || !event.time || !event.time.includes(':')) {
    const startStr = `${year}${pad(month)}${pad(day)}`;
    const nextDate = new Date(year, month - 1, day + 1);
    const endStr = `${nextDate.getFullYear()}${pad(nextDate.getMonth() + 1)}${pad(nextDate.getDate())}`;
    dtStart = `;VALUE=DATE:${startStr}`;
    dtEnd = `;VALUE=DATE:${endStr}`;
  } else {
    const [h, m] = event.time.split(':').map(Number);
    const validH = isNaN(h) ? 10 : h;
    const validM = isNaN(m) ? 0 : m;

    const startStr = `${year}${pad(month)}${pad(day)}T${pad(validH)}${pad(validM)}00`;
    const endH = (validH + 1) % 24;
    const endStr = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(validM)}00`;
    dtStart = `:${startStr}`;
    dtEnd = `:${endStr}`;
  }

  let trigger = '-PT15M';
  if (event.reminderTiming === '30m') trigger = '-PT30M';
  else if (event.reminderTiming === '1h') trigger = '-PT1H';
  else if (event.reminderTiming === 'at_time') trigger = '-PT0M';

  const alarmBlock = `BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:⏰ 兔兔日程提醒: 【${escapeIcsText(event.title)}】
TRIGGER:${trigger}
END:VALARM`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bunny Family Calendar//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id || Date.now()}@bunnyfamily.local`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `SUMMARY:🐰 ${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText((event.description ? event.description + '\n' : '') + '来自兔兔家庭日历')}`,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : '',
    `DTSTART${dtStart}`,
    `DTEND${dtEnd}`,
    alarmBlock,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\;,]/g, (match) => '\\' + match).replace(/\n/g, '\\n');
}

export function exportEventToCalendar(event: CalendarEvent) {
  try {
    const content = generateIcsContent(event);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title || '家庭日程'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (err) {
    console.error('Failed to export .ics calendar event:', err);
  }
}
