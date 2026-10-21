import { getApiBase } from '../config'
import { supabase } from './supabase'

export type PlanType = 'monthly' | 'annual'

/** Stripe Checkout's address for the signed-in user to subscribe to `plan`, once they
 * have asked for PRO to start at once and waived their 14-day withdrawal period */
export async function checkoutUrl(plan: PlanType, withdrawalWaived: true): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')
  const response = await fetch(`${getApiBase()}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    // The backend takes the user from the token; the id stays for a backend deployed before it did
    body: JSON.stringify({ plan_type: plan, withdrawal_waiver: withdrawalWaived, user_id: session.user.id }),
  })
  const data = await response.json()
  if (!response.ok || !data.checkout_url) throw new Error(data.detail ?? `HTTP ${response.status}`)
  return data.checkout_url
}

/** Whether the user has an active or trialing subscription (a past one may sit beside it) */
export async function hasSubscription(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .limit(1)
  return !error && (data?.length ?? 0) > 0
}
