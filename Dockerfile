# Build and publish the application.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["JobTrack.API.csproj", "./"]
COPY ["NuGet.Config", "./"]
RUN dotnet restore "JobTrack.API.csproj"

COPY . .
RUN dotnet publish "JobTrack.API.csproj" --configuration Release --output /app/publish --no-restore /p:UseAppHost=false

# Run on the ASP.NET Core .NET 10 runtime image.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
RUN mkdir -p /app && chown "$APP_UID:$APP_UID" /app
COPY --from=build --chown=$APP_UID:$APP_UID /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 10000
USER $APP_UID

# Render provides PORT at runtime. Use 10000 when running the image elsewhere.
CMD ["sh", "-c", "dotnet JobTrack.API.dll --urls http://0.0.0.0:${PORT:-10000}"]
