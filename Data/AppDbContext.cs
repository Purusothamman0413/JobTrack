using JobTrack.API.Models;
using Microsoft.EntityFrameworkCore;

namespace JobTrack.API.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(user => user.Email).IsUnique();
            entity.Property(user => user.Email).IsRequired();
            entity.Property(user => user.FullName).IsRequired();
            entity.Property(user => user.PasswordHash).IsRequired();
        });

        modelBuilder.Entity<JobApplication>(entity =>
        {
            entity.Property(application => application.CompanyName).IsRequired();
            entity.Property(application => application.JobTitle).IsRequired();
            entity.Property(application => application.Location).IsRequired();
            entity.Property(application => application.Status).IsRequired();
            entity.HasOne(application => application.User)
                .WithMany(user => user.JobApplications)
                .HasForeignKey(application => application.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
