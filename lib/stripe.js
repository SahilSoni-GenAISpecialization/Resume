import Stripe from 'stripe';
import { getSiteUrl as resolveSiteUrl } from '@/lib/site-url';

let stripeClient = null;

/** Lazily create the Stripe client so the app doesn't crash at import time before keys are configured. */
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. Add it to .env.local to enable Pro subscriptions.'
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getProPriceId() {
  if (!process.env.STRIPE_PRICE_ID) {
    throw new Error('STRIPE_PRICE_ID is not configured. Add it to .env.local to enable Pro subscriptions.');
  }

  return process.env.STRIPE_PRICE_ID;
}

export function getSiteUrl(request) {
  return resolveSiteUrl(request);
}
