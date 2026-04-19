export function trimPath(path: google.maps.LatLng[], meters: number): google.maps.LatLng[] {
  if (path.length < 2 || meters <= 0) return path;

  const spherical = google.maps.geometry.spherical;
  const distances: number[] = [0];

  for (let i = 1; i < path.length; i += 1) {
    distances.push(distances[i - 1] + spherical.computeDistanceBetween(path[i - 1], path[i]));
  }

  const totalLength = distances[distances.length - 1];
  if (totalLength <= meters * 2.5) return path;

  const startTrim = meters;
  const endTrim = totalLength - meters;
  const trimmed: google.maps.LatLng[] = [];

  for (let i = 0; i < path.length; i += 1) {
    const d = distances[i];

    if (trimmed.length === 0 && i > 0 && distances[i - 1] < startTrim && d >= startTrim) {
      const segLen = d - distances[i - 1];
      const fraction = segLen > 0 ? (startTrim - distances[i - 1]) / segLen : 0;
      trimmed.push(google.maps.geometry.spherical.interpolate(path[i - 1], path[i], fraction));
    }

    if (d >= startTrim && d <= endTrim) {
      trimmed.push(path[i]);
    }

    if (i > 0 && distances[i - 1] <= endTrim && d > endTrim) {
      const segLen = d - distances[i - 1];
      const fraction = segLen > 0 ? (endTrim - distances[i - 1]) / segLen : 0;
      trimmed.push(google.maps.geometry.spherical.interpolate(path[i - 1], path[i], fraction));
      break;
    }
  }

  return trimmed.length >= 2 ? trimmed : path;
}

export function getMidpoint(encodedPath: string): { lat: number; lng: number } | null {
  if (!google.maps.geometry?.encoding) return null;

  const path = google.maps.geometry.encoding.decodePath(encodedPath);
  if (path.length === 0) return null;
  if (path.length === 1) return { lat: path[0].lat(), lng: path[0].lng() };

  const spherical = google.maps.geometry.spherical;
  let totalLength = 0;
  for (let i = 1; i < path.length; i += 1) {
    totalLength += spherical.computeDistanceBetween(path[i - 1], path[i]);
  }

  const halfLength = totalLength / 2;
  let accumulated = 0;

  for (let i = 1; i < path.length; i += 1) {
    const segLen = spherical.computeDistanceBetween(path[i - 1], path[i]);
    if (accumulated + segLen >= halfLength) {
      const fraction = segLen > 0 ? (halfLength - accumulated) / segLen : 0;
      const mid = spherical.interpolate(path[i - 1], path[i], fraction);
      return { lat: mid.lat(), lng: mid.lng() };
    }
    accumulated += segLen;
  }

  const last = path[path.length - 1];
  return { lat: last.lat(), lng: last.lng() };
}

export function brightenColor(color: string, amount = 0.25): string {
  const match = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return color;

  let hex = match[1];
  if (hex.length === 3) {
    hex = hex.split('').map((char) => `${char}${char}`).join('');
  }

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  const mixToWhite = (channel: number) => Math.max(0, Math.min(255, Math.round(channel + (255 - channel) * amount)));
  const toHex = (channel: number) => mixToWhite(channel).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
