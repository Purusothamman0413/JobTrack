namespace JobTrack.API.DTOs.Applications;

public sealed class JobApplicationResponse
{
    public int Id { get; init; }
    public string CompanyName { get; init; } = string.Empty;
    public string JobTitle { get; init; } = string.Empty;
    public string Location { get; init; } = string.Empty;
    public string? JobUrl { get; init; }
    public DateTime AppliedDate { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public string? JobType { get; init; }
    public string? WorkMode { get; init; }
    public decimal? Salary { get; init; }
    public string? ApplicationSource { get; init; }
    public string? Priority { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
