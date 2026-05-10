using KoncertApp.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace KoncertApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConcertController : ControllerBase
{
    private readonly IConcertService _service;

    public ConcertController(IConcertService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetConcertInfo()
    {
        var info = await _service.GetConcertInfoAsync();
        if (info is null)
            return NotFound(new { message = "Nema unetih podataka o koncertu." });

        return Ok(info);
    }
}
