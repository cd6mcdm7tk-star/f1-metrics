import { getApiBase } from '../config';

export type FeedbackResult = 'sent' | 'limited' | 'failed';

export interface FeedbackForm {
  message: string;
  /** Empty when the visitor wants no reply */
  email: string;
  /** Where they were: path and query */
  page: string;
  /** The field only bots fill in */
  website: string;
}

/** Sends a visitor's message to the site's mailbox; never throws */
export async function sendFeedback(form: FeedbackForm): Promise<FeedbackResult> {
  try {
    const response = await fetch(`${getApiBase()}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: form.email.trim() || null }),
    });
    return response.ok ? 'sent' : response.status === 429 ? 'limited' : 'failed';
  } catch {
    return 'failed';
  }
}
