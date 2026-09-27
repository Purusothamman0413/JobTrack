using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicationDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApplicationSource",
                table: "JobApplications",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "JobType",
                table: "JobApplications",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "JobApplications",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Salary",
                table: "JobApplications",
                type: "TEXT",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkMode",
                table: "JobApplications",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApplicationSource",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "JobType",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "Salary",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "WorkMode",
                table: "JobApplications");
        }
    }
}
