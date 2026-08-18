import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "./config";

let cached: Stripe | null = null;

/** `null` quando l'app gira in modalità demo (nessuna chiave configurata). */
export function getStripe(): Stripe | null {
  if (!STRIPE_SECRET_KEY) return null;
  cached ??= new Stripe(STRIPE_SECRET_KEY);
  return cached;
}
