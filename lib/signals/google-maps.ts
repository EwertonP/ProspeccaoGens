import type { ScoreInput } from "../scoring";

// Extrai sinais de qualificação de UM item bruto do dataset do Apify
// (ator compass/crawler-google-places). Nomes de campo seguem o schema
// documentado do ator (title, placeId, phone, website, categoryName,
// totalScore, reviewsCount, reviews[].publishedAtDate/responseFromOwnerText,
// imageUrls[]) -- CONFIRMAR contra uma amostra real do dataset na primeira
// execução, o Apify pode ajustar nomes entre versões do ator.
//
// Regra central: um sinal só é 'observado' se o dado existir de fato no
// payload daquela run; senão fica 'nao_verificavel' -- nunca 'false' por
// omissão (reviews/imagens só vêm se a run pediu maxReviews/maxImages > 0,
// o que custa mais no Apify).

interface GoogleMapsReview {
  publishedAtDate?: string;
  responseFromOwnerText?: string;
  responseFromOwnerDate?: string;
}

interface GoogleMapsPlace {
  placeId?: string;
  title?: string;
  categoryName?: string;
  address?: string;
  city?: string;
  state?: string;
  location?: { lat?: number; lng?: number };
  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  url?: string;
  totalScore?: number;
  reviewsCount?: number;
  openingHours?: unknown[];
  reviews?: GoogleMapsReview[];
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
}

export interface ExtractedLead {
  externalId: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  websiteUrl: string | null;
  googleMapsUrl: string | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
  signals: ScoreInput[];
}

const RECENT_REVIEW_WINDOW_DAYS = 90;

function daysSince(dateString: string): number {
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

export function extractGoogleMapsLead(place: GoogleMapsPlace): ExtractedLead | null {
  if (!place.placeId || !place.title) return null;

  const signals: ScoreInput[] = [];

  signals.push({ signal_key: "has_phone", value: !!(place.phone || place.phoneUnformatted), confidence: "observado" });
  signals.push({ signal_key: "has_website", value: !!place.website, confidence: "observado" });

  const profileComplete = !!(place.phone && place.address && place.categoryName && place.openingHours?.length);
  signals.push({ signal_key: "profile_complete", value: profileComplete, confidence: "observado" });

  if (typeof place.totalScore === "number") {
    signals.push({ signal_key: "google_rating_good", value: place.totalScore >= 4.0, confidence: "observado" });
  } else {
    signals.push({ signal_key: "google_rating_good", value: null, confidence: "nao_verificavel" });
  }

  if (place.reviews && place.reviews.length > 0) {
    const hasRecentReview = place.reviews.some(
      (r) => r.publishedAtDate && daysSince(r.publishedAtDate) < RECENT_REVIEW_WINDOW_DAYS
    );
    signals.push({ signal_key: "recent_reviews", value: hasRecentReview, confidence: "observado" });

    const ownerResponds = place.reviews.some((r) => !!r.responseFromOwnerText);
    signals.push({ signal_key: "owner_responds_reviews", value: ownerResponds, confidence: "observado" });
  } else {
    signals.push({
      signal_key: "recent_reviews",
      value: null,
      confidence: "nao_verificavel",
    });
    signals.push({
      signal_key: "owner_responds_reviews",
      value: null,
      confidence: "nao_verificavel",
    });
  }

  // Fora do alcance da fonte Google Maps -- explicitamente desconhecido,
  // nunca chutado. Fica pronto pro dia em que Instagram/LinkedIn entrarem.
  signals.push({ signal_key: "posts_regularly", value: null, confidence: "nao_verificavel" });
  signals.push({ signal_key: "runs_paid_ads", value: null, confidence: "nao_verificavel" });

  return {
    externalId: place.placeId,
    name: place.title,
    category: place.categoryName ?? null,
    address: place.address ?? null,
    city: place.city ?? null,
    state: place.state ?? null,
    lat: place.location?.lat ?? null,
    lng: place.location?.lng ?? null,
    phone: place.phone ?? place.phoneUnformatted ?? null,
    websiteUrl: place.website ?? null,
    googleMapsUrl: place.url ?? null,
    googleRating: place.totalScore ?? null,
    googleReviewsCount: place.reviewsCount ?? null,
    signals,
  };
}
