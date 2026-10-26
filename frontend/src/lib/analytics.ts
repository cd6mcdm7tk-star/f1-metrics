import type { BeforeSend } from '@vercel/analytics/react'

/** A page's address as analytics records it: campaign tags kept, the rest of
 * the query and the hash dropped, since reset and checkout links carry tokens */
export function analyticsUrl(url: string): string {
  const page = new URL(url)
  for (const key of [...page.searchParams.keys()]) {
    if (!key.startsWith('utm_')) page.searchParams.delete(key)
  }
  page.hash = ''
  return page.toString()
}

export const beforeSend: BeforeSend = event => ({ ...event, url: analyticsUrl(event.url) })
