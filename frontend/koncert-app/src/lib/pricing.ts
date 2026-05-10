const EARLY_BIRD = 0.10;
const FIFTH_DISCOUNT = 0.50;
const PROMO = 0.05;

export interface PricingBreakdown {
  unitPrice: number;
  subtotalBeforePromo: number;
  earlyBirdSavings: number;
  fifthTicketSavings: number;
  promoSavings: number;
  total: number;
}

export function calculatePricing(
  basePrice: number,
  ticketCount: number,
  isEarlyBird: boolean,
  hasPromo: boolean,
): PricingBreakdown {
  const unitPrice = isEarlyBird ? basePrice * (1 - EARLY_BIRD) : basePrice;

  let subtotal = 0;
  let fifthSavings = 0;

  for (let i = 1; i <= ticketCount; i++) {
    if (i % 5 === 0) {
      const discounted = unitPrice * (1 - FIFTH_DISCOUNT);
      subtotal += discounted;
      fifthSavings += unitPrice - discounted;
    } else {
      subtotal += unitPrice;
    }
  }

  const earlyBirdSavings = isEarlyBird ? basePrice * EARLY_BIRD * ticketCount : 0;

  const promoSavings = hasPromo ? subtotal * PROMO : 0;
  const total = subtotal - promoSavings;

  return {
    unitPrice: round2(unitPrice),
    subtotalBeforePromo: round2(subtotal),
    earlyBirdSavings: round2(earlyBirdSavings),
    fifthTicketSavings: round2(fifthSavings),
    promoSavings: round2(promoSavings),
    total: round2(total),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
