import { api } from './client';
import type {
  ConcertInfo,
  CreateReservationRequest,
  UpdateReservationRequest,
  CancelReservationRequest,
  ReservationResponse,
} from './types';

export async function getConcert(): Promise<ConcertInfo> {
  const { data } = await api.get<ConcertInfo>('/concert');
  return data;
}

export async function createReservation(body: CreateReservationRequest): Promise<ReservationResponse> {
  const { data } = await api.post<ReservationResponse>('/reservation', body);
  return data;
}

export async function getReservation(email: string, token: string): Promise<ReservationResponse> {
  const { data } = await api.get<ReservationResponse>('/reservation', {
    params: { email, token },
  });
  return data;
}

export async function updateReservation(body: UpdateReservationRequest): Promise<ReservationResponse> {
  const { data } = await api.put<ReservationResponse>('/reservation', body);
  return data;
}

export async function cancelReservation(body: CancelReservationRequest): Promise<void> {
  await api.delete('/reservation', { data: body });
}
