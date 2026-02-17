export function formatDistanceMeters(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }
  return `${Math.round(value)} m`;
}

export function formatDurationMinutes(value: number): string {
  if (value >= 60) {
    const hours = Math.floor(value / 60);
    const minutes = Math.round(value % 60);
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
  return `${Math.round(value)}m`;
}
