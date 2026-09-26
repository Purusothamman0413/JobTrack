using System.ComponentModel.DataAnnotations;

namespace JobTrack.API.Models;

public sealed class User
{
    public int Id { get; set; }

    [Required, MaxLength(120)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
}
