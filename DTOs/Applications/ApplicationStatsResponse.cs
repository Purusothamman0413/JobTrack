namespace JobTrack.API.DTOs.Applications;

public sealed class ApplicationStatsResponse
{
    public int Total { get; init; }
    public int Applied { get; init; }
    public int Interview { get; init; }
    public int Selected { get; init; }
    public int Rejected { get; init; }
    public double InterviewRate { get; init; }
    public double SelectionRate { get; init; }
    public int ThisMonth { get; init; }
}
