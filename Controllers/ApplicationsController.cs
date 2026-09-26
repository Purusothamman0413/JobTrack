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
    public async Task<ActionResult<IEnumerable<JobApplication>>> GetAll(
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

        return Ok(await query.OrderByDescending(application => application.AppliedDate).ToListAsync(cancellationToken));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var counts = await dbContext.JobApplications.AsNoTracking()
            .Where(application => application.UserId == userId)
            .GroupBy(application => application.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Status, item => item.Count, cancellationToken);
        return Ok(new
        {
            total = counts.Values.Sum(),
            applied = GetCount(counts, "Applied"),
            interview = GetCount(counts, "Interview"),
            selected = GetCount(counts, "Selected"),
            rejected = GetCount(counts, "Rejected")
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<JobApplication>> GetById(int id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var application = await dbContext.JobApplications.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId, cancellationToken);
        return application is null ? NotFound() : Ok(application);
    }

    [HttpPost]
    public async Task<ActionResult<JobApplication>> Create(CreateApplicationRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (!IsAllowedStatus(request.Status)) return BadRequest(new { message = "Status is invalid." });
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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.JobApplications.Add(application);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = application.Id }, application);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateApplicationRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (!IsAllowedStatus(request.Status)) return BadRequest(new { message = "Status is invalid." });
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
        application.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
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

    private static bool IsAllowedStatus(string status) => AllowedStatuses.Contains(status);
    private static int GetCount(IReadOnlyDictionary<string, int> counts, string key) =>
        counts.TryGetValue(key, out var count) ? count : 0;
}
