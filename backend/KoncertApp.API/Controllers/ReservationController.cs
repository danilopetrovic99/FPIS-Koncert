using KoncertApp.API.DTOs;
using KoncertApp.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace KoncertApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReservationController : ControllerBase
{
    private readonly IReservationService _service;

    public ReservationController(IReservationService service)
    {
        _service = service;
    }

    /// <summary>
    /// Kreira novu rezervaciju. Vraća token i generirani promo kod.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservationDto dto)
    {
        try
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(Get),
                new { email = result.Email, token = result.Token },
                result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Dohvata aktivnu rezervaciju po emailu i tokenu.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string email, [FromQuery] string token)
    {
        try
        {
            var result = await _service.GetByTokenAsync(email, token);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Menja broj karata u rezervaciji uz ponovni obračun cene.
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateReservationDto dto)
    {
        try
        {
            var result = await _service.UpdateAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Otkazuje rezervaciju. Token i promo kod postaju trajno neaktivni.
    /// </summary>
    [HttpDelete]
    public async Task<IActionResult> Cancel([FromBody] CancelReservationDto dto)
    {
        try
        {
            await _service.CancelAsync(dto);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
