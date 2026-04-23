using KoncertApp.API.DTOs;

namespace KoncertApp.API.Services;

public interface IReservationService
{
    Task<ReservationResponseDto> CreateAsync(CreateReservationDto dto);
    Task<ReservationResponseDto> GetByTokenAsync(string email, string token);
    Task<ReservationResponseDto> UpdateAsync(UpdateReservationDto dto);
    Task CancelAsync(CancelReservationDto dto);
}
