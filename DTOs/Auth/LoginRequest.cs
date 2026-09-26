using System.ComponentModel.DataAnnotations;

namespace JobTrack.API.DTOs.Auth;

public sealed class LoginRequest
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;
}
