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

    [RegularExpression("^(Full-time|Part-time|Internship|Contract|Freelance)$")]
    public string? JobType { get; init; }

    [RegularExpression("^(Remote|Hybrid|On-site)$")]
    public string? WorkMode { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal? Salary { get; init; }

    [RegularExpression("^(LinkedIn|Naukri|Company Website|Indeed|Referral|Other)$")]
    public string? ApplicationSource { get; init; }

    [RegularExpression("^(Low|Medium|High)$")]
    public string? Priority { get; init; }
}
