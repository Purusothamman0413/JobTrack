using System.ComponentModel.DataAnnotations;

namespace JobTrack.API.DTOs.Applications;

public class CreateApplicationRequest
{
    [Required, StringLength(160)] public string CompanyName { get; init; } = string.Empty;
    [Required, StringLength(160)] public string JobTitle { get; init; } = string.Empty;
    [Required, StringLength(160)] public string Location { get; init; } = string.Empty;
    [Url, StringLength(2048)] public string? JobUrl { get; init; }
    public DateTime AppliedDate { get; init; }
    [Required, RegularExpression("^(Applied|Interview|Selected|Rejected)$")] public string Status { get; init; } = "Applied";
    [StringLength(4000)] public string? Notes { get; init; }
}
