[CmdletBinding()]
param(
    [string]$EnvFile = ".env.github.secrets",
    [string]$Repo,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-CommandExists {
    param([Parameter(Mandatory = $true)][string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-RepoFromGitRemote {
    $remote = (& git remote get-url origin).Trim()
    if (-not $remote) {
        throw "Could not read origin remote from git. Pass -Repo owner/repo explicitly."
    }

    if ($remote -match 'github\.com[:/](?<repo>[^/]+/[^/.]+)(\.git)?$') {
        return $Matches.repo
    }

    throw "Origin remote '$remote' is not a GitHub repo URL. Pass -Repo owner/repo explicitly."
}

function Parse-SecretsFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Secrets file not found: $Path"
    }

    $secrets = [ordered]@{}
    $lines = Get-Content -LiteralPath $Path

    foreach ($rawLine in $lines) {
        $line = $rawLine.Trim()

        if (-not $line -or $line.StartsWith('#')) {
            continue
        }

        if ($line -notmatch '^(?<key>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?<value>.*)$') {
            throw "Invalid line in secrets file: '$rawLine'. Use KEY=VALUE format."
        }

        $key = $Matches.key
        $value = $Matches.value.Trim()

        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        if ($value.StartsWith('@')) {
            $filePath = $value.Substring(1)
            if (-not (Test-Path -LiteralPath $filePath)) {
                throw "File path for secret '$key' was not found: $filePath"
            }
            $value = Get-Content -LiteralPath $filePath -Raw
        }

        $secrets[$key] = $value
    }

    return $secrets
}

if (-not (Test-CommandExists -Name 'gh')) {
    throw "GitHub CLI ('gh') is required. Install it with: winget install --id GitHub.cli"
}

$null = & gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI is not authenticated. Run: gh auth login"
}

if (-not $Repo) {
    $Repo = Get-RepoFromGitRemote
}

$resolvedEnvFile = Resolve-Path -LiteralPath $EnvFile
$secrets = Parse-SecretsFile -Path $resolvedEnvFile

if ($secrets.Count -eq 0) {
    throw "No secrets found in $resolvedEnvFile"
}

Write-Host "Target repo: $Repo"
Write-Host "Secrets file: $resolvedEnvFile"
Write-Host "Found $($secrets.Count) secret(s)."

foreach ($entry in $secrets.GetEnumerator()) {
    $name = $entry.Key
    $value = [string]$entry.Value

    if ($DryRun) {
        Write-Host "[DRY RUN] Would upload secret: $name"
        continue
    }

    $value | & gh secret set $name --repo $Repo
    if ($LASTEXITCODE -ne 0) {
        throw "Failed uploading secret '$name'"
    }

    Write-Host "Uploaded: $name"
}

if ($DryRun) {
    Write-Host "Dry run complete. No secrets were uploaded."
} else {
    Write-Host "All secrets uploaded successfully."
}
