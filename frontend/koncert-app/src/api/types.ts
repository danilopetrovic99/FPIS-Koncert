export interface ZoneInfo {
  id: number;
  name: string;
  capacity: number;
  availableSeats: number;
  pricePerTicket: number;
}

export interface ConcertInfo {
  id: number;
  name: string;
  city: string;
  location: string;
  concertDates: string;
  additionalInfo: string | null;
  earlyBirdDeadline: string;
  isEarlyBirdActive: boolean;
  zones: ZoneInfo[];
}

export interface CreateReservationRequest {
  zoneId: number;
  ticketCount: number;
  firstName: string;
  lastName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  promoCode?: string | null;
}

export interface UpdateReservationRequest {
  token: string;
  email: string;
  ticketCount: number;
}

export interface CancelReservationRequest {
  token: string;
  email: string;
}

export interface ReservationResponse {
  id: number;
  token: string;
  status: string;
  zoneId: number;
  zoneName: string;
  ticketCount: number;
  totalPrice: number;
  isEarlyBird: boolean;
  generatedPromoCode: string;
  createdAt: string;

  firstName: string;
  lastName: string;
  email: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  postalCode: string;
  city: string;
  country: string;
}

export interface ApiError {
  message: string;
}
