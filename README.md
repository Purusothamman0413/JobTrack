# JobTrack

A full-stack job application tracking system built with ASP.NET Core and vanilla JavaScript.

## Features

- User registration and login
- JWT authentication
- Add job applications
- Edit applications
- Delete applications
- Search applications by company or job title
- Filter applications by status
- Application statistics dashboard
- SQLite database
- Responsive web UI
- Swagger API documentation

## Tech Stack

- C#
- .NET 10
- ASP.NET Core Web API
- Entity Framework Core
- SQLite
- JWT Authentication
- HTML
- CSS
- JavaScript
- Swagger / OpenAPI

## Architecture

The browser serves the HTML, CSS, and JavaScript frontend from the ASP.NET Core application. The frontend calls the ASP.NET Core Web API, which uses Entity Framework Core to read and write data in SQLite.

```text
Browser
  → HTML / CSS / JavaScript frontend
  → ASP.NET Core Web API
  → Entity Framework Core
  → SQLite
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Sign in and receive a JWT |

### Applications

These endpoints require a JWT Bearer token. Application data is scoped to the authenticated user.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/applications` | List applications; accepts optional `search` and `status` query parameters |
| `GET` | `/api/applications/{id}` | Get an application |
| `POST` | `/api/applications` | Create an application |
| `PUT` | `/api/applications/{id}` | Update an application |
| `DELETE` | `/api/applications/{id}` | Delete an application |
| `GET` | `/api/applications/stats` | Get application counts by status |

## Running Locally

Prerequisites: .NET 10 SDK. The project includes the EF Core design package; the `dotnet ef` command-line tool must also be available.

From the project directory, restore packages, apply the database migrations, and start the HTTP development profile:

```powershell
dotnet restore
dotnet ef database update
dotnet run --launch-profile http
```

Open the dashboard at [http://localhost:5179/](http://localhost:5179/).

Swagger UI is available at [http://localhost:5179/swagger](http://localhost:5179/swagger).

The local SQLite database is created as `jobtrack.db` in the application working directory and is ignored by Git. The JWT key in `appsettings.json` is a development-only placeholder. Configure secrets securely for any non-development environment; do not commit production credentials.

## Future Improvements

- Better analytics
- Kanban/status pipeline
- Notifications
- Resume management
- Cloud deployment
- PostgreSQL support
