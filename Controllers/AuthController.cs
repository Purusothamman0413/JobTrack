using JobTrack.API.DTOs.Auth;
using JobTrack.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace JobTrack.API.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (!await authService.RegisterAsync(request, cancellationToken))
        {
            return Conflict(new { message = "An account with this email already exists." });
        }

        return StatusCode(StatusCodes.Status201Created, new { message = "Registration successful." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var token = await authService.LoginAsync(request, cancellationToken);
        return token is null
            ? Unauthorized(new { message = "Invalid email or password." })
            : Ok(new { token });
    }
}
