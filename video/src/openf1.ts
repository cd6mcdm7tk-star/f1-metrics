// OpenF1's public API, for what our own doesn't serve yet: the official
// classification, the grid, stints and race control, as soon as a session ends.

const OPENF1 = 'https://api.openf1.org/v1';

/** Plain requests, without our API's admin header; waits out its rate limit */
export async function openF1<T>(path: string, retries = 4): Promise<T> {
  const response = await fetch(`${OPENF1}${path}`);
  if (response.status === 429 && retries > 0) {
    await new Promise(resolve => setTimeout(resolve, 5_000));
    return openF1(path, retries - 1);
  }
  if (!response.ok) throw new Error(`${OPENF1}${path}: HTTP ${response.status}`);
  return response.json();
}

/** A session's key, by year, place and name ("Qualifying", "Race") */
export async function sessionKey(year: number, location: string, name: string): Promise<number> {
  const sessions = await openF1<{ session_key: number }[]>(`/sessions?year=${year}&location=${encodeURIComponent(location)}&session_name=${encodeURIComponent(name)}`);
  if (!sessions.length) throw new Error(`No ${name} on OpenF1 for ${location} ${year}`);
  return sessions[0].session_key;
}

export interface OpenF1Driver {
  driver_number: number;
  name_acronym: string;
}

/** Driver numbers to their three-letter codes, for a session */
export async function driverCodes(key: number): Promise<Map<number, string>> {
  const drivers = await openF1<OpenF1Driver[]>(`/drivers?session_key=${key}`);
  return new Map(drivers.map(d => [d.driver_number, d.name_acronym]));
}
