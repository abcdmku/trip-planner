export function toMins(value: string): number {
  if (!value) return 0;
  const part = value.includes('T') ? value.split('T')[1] : value;
  const [hours, minutes] = part.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function toTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

export function displayShort(value: string): string {
  const total = toMins(value);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? 'p' : 'a';
  const hour12 = hours % 12 || 12;
  return minutes ? `${hour12}:${String(minutes).padStart(2, '0')}${suffix}` : `${hour12}${suffix}`;
}

export function snapM(minutes: number, snapSize = 5): number {
  return Math.round(minutes / snapSize) * snapSize;
}

export function mToY(minutes: number, startHour: number, pxPerMinute: number): number {
  return (minutes - startHour * 60) * pxPerMinute;
}

export function hourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}
