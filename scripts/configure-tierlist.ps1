param([string]$Origins = '')

$ErrorActionPreference = 'Stop'
$projectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$secretFile = [IO.Path]::GetFullPath((Join-Path $projectDirectory '.env.server'))
if (-not $secretFile.StartsWith($projectDirectory + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'La ruta del archivo privado debe permanecer dentro del proyecto.'
}
if ($Origins) {
    foreach ($value in $Origins.Split(',')) {
        $originUri = $null
        if (-not [Uri]::TryCreate($value.Trim(), [UriKind]::Absolute, [ref]$originUri) -or
            $originUri.UserInfo -or $originUri.Query -or $originUri.Fragment -or $originUri.AbsolutePath -ne '/' -or
            ($originUri.Scheme -ne 'https' -and -not ($originUri.Scheme -eq 'http' -and $originUri.Host -in @('localhost', '127.0.0.1')))) {
            throw 'Los orígenes deben ser direcciones HTTPS exactas, o localhost/127.0.0.1 para desarrollo.'
        }
    }
    $Origins = ($Origins.Split(',') | ForEach-Object { $_.Trim().TrimEnd('/') }) -join ','
}
$secureWebhook = Read-Host 'Pega el NUEVO enlace de webhook de Discord (se mantiene oculto)' -AsSecureString
$webhookPointer = [IntPtr]::Zero
try {
    $webhookPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureWebhook)
    $webhookValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($webhookPointer)
    $webhookUri = $null
    if ($webhookValue -match '[\r\n]' -or -not [Uri]::TryCreate($webhookValue, [UriKind]::Absolute, [ref]$webhookUri) -or
        $webhookUri.Scheme -ne 'https' -or $webhookUri.Host -ne 'discord.com' -or
        $webhookUri.UserInfo -or -not $webhookUri.IsDefaultPort -or
        $webhookUri.AbsolutePath -notmatch '^/api(?:/v\d+)?/webhooks/\d+/[a-zA-Z0-9_-]+$') {
        throw 'El enlace no es un webhook válido de Discord.'
    }
    $contents = "DISCORD_TIERLIST_WEBHOOK=$webhookValue`nTHC_ALLOWED_ORIGINS=$Origins`n"
    [IO.File]::WriteAllText($secretFile, $contents, [Text.UTF8Encoding]::new($false))
    Write-Host 'Configuración privada guardada en .env.server. El enlace no se añadió al cliente.'
    Write-Host 'Aplica supabase/tierlist_rate_limit.sql en Supabase SQL Editor antes de enviar.'
    Write-Host 'Con npm run dev el servidor local utiliza este archivo; no lo publiques ni lo envíes por chat.'
} finally {
    if ($webhookPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($webhookPointer) }
    $webhookValue = $null
    $contents = $null
    $secureWebhook.Dispose()
}
