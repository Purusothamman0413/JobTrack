using System.Security.Claims;
using JobTrack.API.Data;
using JobTrack.API.DTOs.Applications;
using JobTrack.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobTrack.API.Controllers;

[ApiController]
[Authorize]
[Route("api/applications")]
public sealed class ApplicationsController(AppDbContext dbContext) : ControllerBase
{
    private static readonly string[] AllowedStatuses = ["Applied", "Interview", "Selected", "Rejected"];

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<JobApplicationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<JobApplicationResponse>>> GetAll(
        [FromQuery] string? search, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var query = dbContext.JobApplications.AsNoTracking().Where(application => application.UserId == userId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(application => application.CompanyName.Contains(term) || application.JobTitle.Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(application => application.Status == status.Trim());
        }

        var applications = await query.OrderByDescending(application => application.AppliedDate)
            .ToListAsync(cancellationToken);
        return Ok(applications.Select(ToResponse));
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(ApplicationStatsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApplicationStatsResponse>> GetStats(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var userApplications = dbContext.JobApplications.AsNoTracking()
            .Where(application => application.UserId == userId);
        var counts = await userApplications
            .GroupBy(application => application.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Status, item => item.Count, cancellationToken);

        var total = counts.Values.Sum();
        var interviewCount = GetCount(counts, "Interview");
        var selectedCount = GetCount(counts, "Selected");
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextMonthStart = monthStart.AddMonths(1);
        var thisMonth = await userApplications.CountAsync(
            application => application.AppliedDate >= monthStart && application.AppliedDate < nextMonthStart,
            cancellationToken);

        return Ok(new ApplicationStatsResponse
        {
            Total = total,
            Applied = GetCount(counts, "Applied"),
            Interview = interviewCount,
            Selected = selectedCount,
            Rejected = GetCount(counts, "Rejected"),
            InterviewRate = total == 0 ? 0 : (double)interviewCount / total * 100,
            SelectionRate = total == 0 ? 0 : (double)selectedCount / total * 100,
            ThisMonth = thisMonth
        });
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(JobApplicationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JobApplicationResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var application = await dbContext.JobApplications.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId, cancellationToken);
        return application is null ? NotFound() : Ok(ToResponse(application));
    }

    [HttpPost]
    [ProducesResponseType(typeof(JobApplicationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<JobApplicationResponse>> Create(CreateApplicationRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var validationResult = ValidateApplicationRequest(request);
        if (validationResult is not null) return validationResult;
        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = request.CompanyName.Trim(),
            JobTitle = request.JobTitle.Trim(),
            Location = request.Location.Trim(),
            JobUrl = request.JobUrl,
            AppliedDate = request.AppliedDate,
            Status = request.Status,
            Notes = request.Notes,
            JobType = request.JobType,
            WorkMode = request.WorkMode,
            Salary = request.Salary,
            ApplicationSource = request.ApplicationSource,
            Priority = request.Priority,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.JobApplications.Add(application);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = application.Id }, ToResponse(application));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, UpdateApplicationRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var validationResult = ValidateApplicationRequest(request);
        if (validationResult is not null) return validationResult;
        var application = await dbContext.JobApplications
            .SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId, cancellationToken);
        if (application is null) return NotFound();

        application.CompanyName = request.CompanyName.Trim();
        application.JobTitle = request.JobTitle.Trim();
        application.Location = request.Location.Trim();
        application.JobUrl = request.JobUrl;
        application.AppliedDate = request.AppliedDate;
        application.Status = request.Status;
        application.Notes = request.Notes;
        application.JobType = request.JobType;
        application.WorkMode = request.WorkMode;
        application.Salary = request.Salary;
        application.ApplicationSource = request.ApplicationSource;
        application.Priority = request.Priority;
        application.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var application = await dbContext.JobApplications
            .SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId, cancellationToken);
        if (application is null) return NotFound();
        dbContext.JobApplications.Remove(application);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private bool TryGetUserId(out int userId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private BadRequestObjectResult? ValidateApplicationRequest(CreateApplicationRequest request)
    {
        if (request.AppliedDate == default)
            return BadRequest(new { message = "Applied date is required." });

        if (!IsAllowedStatus(request.Status))
            return BadRequest(new { message = "Status is invalid." });

        if (request.Salary is decimal salary && decimal.Round(salary, 2) != salary)
            return BadRequest(new { message = "Salary can have no more than two decimal places." });

        return null;
    }

    private static JobApplicationResponse ToResponse(JobApplication application) => new()
    {
        Id = application.Id,
        CompanyName = application.CompanyName,
        JobTitle = application.JobTitle,
        Location = application.Location,
        JobUrl = application.JobUrl,
        AppliedDate = application.AppliedDate,
        Status = application.Status,
        Notes = application.Notes,
        JobType = application.JobType,
        WorkMode = application.WorkMode,
        Salary = application.Salary,
        ApplicationSource = application.ApplicationSource,
        Priority = application.Priority,
        CreatedAt = application.CreatedAt,
        UpdatedAt = application.UpdatedAt
    };

    private static bool IsAllowedStatus(string status) => AllowedStatuses.Contains(status);
    private static int GetCount(IReadOnlyDictionary<string, int> counts, string key) =>
        counts.TryGetValue(key, out var count) ? count : 0;
}
