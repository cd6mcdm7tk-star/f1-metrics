/**
 * METRIK DELTA - SignalR Client
 * Returns our backend negotiate URL.
 * The browser connects directly to F1 SignalR after getting the token.
 */

import { getBackendUrl } from '../../config';

export class SignalRClient {
  /** Returns the backend negotiate proxy URL. */
  static getNegotiateUrl(): string {
    return `${getBackendUrl()}/api/livetiming/negotiate`;
  }
}
