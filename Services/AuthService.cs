using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using JobTrack.API.Data;
using JobTrack.API.DTOs.Auth;
using JobTrack.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace JobTrack.API.Services;

public sealed class AuthService(
    AppDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration) : IAuthService
{
    public async Task<bool> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await dbContext.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            return false;
        }

        var user = new User { FullName = request.FullName.Trim(), Email = email };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        dbContext.Users.Add(user);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqliteException { SqliteErrorCode: 19 })
        {
            dbContext.Entry(user).State = EntityState.Detached;
            return false;
        }
    }

    public async Task<string?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.SingleOrDefaultAsync(item => item.Email == email, cancellationToken);
        if (user is null || passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password)
            == PasswordVerificationResult.Failed)
        {
            return null;
        }

        var key = configuration["Jwt:Key"]!;
        var issuer = configuration["Jwt:Issuer"]!;
        var audience = configuration["Jwt:Audience"]!;
        var expiryMinutes = configuration.GetValue<int>("Jwt:ExpiryMinutes", 60);
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email)
        };
        var token = new JwtSecurityToken(issuer, audience, claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes), signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
