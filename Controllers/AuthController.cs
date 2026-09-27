using JobTrack.API.DTOs.Auth;
using JobTrack.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace JobTrack.API.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthMessageResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(AuthMessageResponse), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthMessageResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (!await authService.RegisterAsync(request, cancellationToken))
        {
            return Conflict(new AuthMessageResponse("An account with this email already exists."));
        }

        return StatusCode(StatusCodes.Status201Created, new AuthMessageResponse("Registration successful."));
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthMessageResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var token = await authService.LoginAsync(request, cancellationToken);
        return token is null
            ? Unauthorized(new AuthMessageResponse("Invalid email or password."))
            : Ok(new LoginResponse(token));
    }
}
