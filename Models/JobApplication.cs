using System.ComponentModel.DataAnnotations;

namespace JobTrack.API.Models;

public sealed class JobApplication
{
    public int Id { get; set; }
    public int UserId { get; set; }

    [Required, MaxLength(160)]
    public string CompanyName { get; set; } = string.Empty;

    [Required, MaxLength(160)]
    public string JobTitle { get; set; } = string.Empty;

    [Required, MaxLength(160)]
    public string Location { get; set; } = string.Empty;

    [Url, MaxLength(2048)]
    public string? JobUrl { get; set; }

    public DateTime AppliedDate { get; set; }

    [Required, MaxLength(20)]
    public string Status { get; set; } = "Applied";

    [MaxLength(4000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
