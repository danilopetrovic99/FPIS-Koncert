using KoncertApp.API.DTOs;

namespace KoncertApp.API.Services;

public interface IConcertService
{
    Task<ConcertInfoDto?> GetConcertInfoAsync();
}
