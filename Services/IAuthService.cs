using JobTrack.API.DTOs.Auth;

namespace JobTrack.API.Services;

public interface IAuthService
{
    Task<bool> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<string?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
}
