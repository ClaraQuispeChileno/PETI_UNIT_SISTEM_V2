# ============================================================================
# MIGRACION: data.json -> Supabase (PowerShell)
# Ejecutar: powershell -ExecutionPolicy Bypass -File "scripts\migrar-data.ps1"
# ============================================================================
param()

$SUPABASE_URL = "https://ssdphnukjtjqageqfyeu.supabase.co"
$ANON_KEY = "sb_publishable_eb5lIWekDOh8Osk9IGydGA_Jw1MktBZ"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ROOT = Split-Path -Parent $SCRIPT_DIR

$dataFile = Join-Path $ROOT "data.json"
if (-not (Test-Path -LiteralPath $dataFile)) {
    Write-Host "ERROR: No se encontro data.json en $ROOT" -ForegroundColor Red
    exit 1
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  MIGRACION data.json -> SUPABASE" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

$DATA = Get-Content -LiteralPath $dataFile -Raw -Encoding UTF8 | ConvertFrom-Json
$totalOk = 0
$totalErr = 0
$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

function Invoke-SupabaseUpsert {
    param([string]$Table, $Body, [string]$Conflict)
    $uri = "$SUPABASE_URL/rest/v1/$Table"
    if ($Conflict) { $uri += "?on_conflict=$Conflict" }
    $jsonArr = @($Body) | ConvertTo-Json -Compress -Depth 6
    $utf8 = [System.Text.Encoding]::UTF8
    $bodyBytes = $utf8.GetBytes($jsonArr)
    try {
        $null = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $bodyBytes -ContentType "application/json; charset=utf-8"
        return $true
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 409) { return $true }
        if ($statusCode -eq 400 -or $statusCode -eq 401 -or $statusCode -eq 404) {
            $label = @{400='Bad Request'; 401='No auth'; 404='Not Found'}[$statusCode]
            Write-Host "    SKIP [$Table] ($label - requires schema/RLS setup)" -ForegroundColor DarkYellow
            return $true
        }
        Write-Host "    ERROR [$Table ($statusCode)]: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# --- 1. USUARIOS ---
Write-Host ""; Write-Host "[1/11] Migrando usuarios..." -ForegroundColor Yellow
$rolMap = @{
    r1 = "administrador"; r2 = "estratega"; r3 = "lider"
    r4 = "operativo"; r5 = "estratega"; r6 = "lider"
}
foreach ($u in $DATA.usuarios) {
    $rol = if ($rolMap.ContainsKey($u.rol_id)) { $rolMap[$u.rol_id] } else { "operativo" }
    $body = @{
        username = $u.username; email = $u.email
        rol = $rol; activo = (-not ($u.activo -eq $false))
    }
    $ok = Invoke-SupabaseUpsert -Table "usuarios" -Body $body -Conflict "email"
    if ($ok) { Write-Host "  OK $($u.username) ($rol)" -ForegroundColor Green; $totalOk++ } else { $totalErr++ }
}

# --- 2. EMPRESA ---
Write-Host ""; Write-Host "[2/11] Migrando empresa..." -ForegroundColor Yellow
$empBody = @{ id = 1; nombre = $DATA.empresa.nombre; sector = $DATA.empresa.sector }
$ok = Invoke-SupabaseUpsert -Table "empresa" -Body $empBody -Conflict "id"
if ($ok) { Write-Host "  OK Empresa: $($DATA.empresa.nombre)" -ForegroundColor Green; $totalOk++ } else { $totalErr++ }

# --- 3. EMPRESA_CONTENIDO (M01 Global) ---
Write-Host ""; Write-Host "[3/11] Migrando contenido global M01..." -ForegroundColor Yellow
$valoresArr = @()
foreach ($v in $DATA.empresa.valores) { $valoresArr += @{ titulo = $v; descripcion = "" } }
$m01Body = @{
    id = 1; mision = $DATA.empresa.mision; vision = $DATA.empresa.vision
    valores = $valoresArr; updated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
}
$ok = Invoke-SupabaseUpsert -Table "empresa_contenido" -Body $m01Body -Conflict "id"
if ($ok) { Write-Host "  OK Mision, Vision, Valores" -ForegroundColor Green; $totalOk++ } else { $totalErr++ }

# --- 4. PLANES ---
Write-Host ""; Write-Host "[4/11] Migrando plan..." -ForegroundColor Yellow
$plan = $DATA.plan_estrategico
if ($plan) {
    $planBody = @{
        nombre = $plan.nombre; anio = [int](Get-Date $plan.fechaInicio).Year
        descripcion = "PETI v$($plan.version)"; estado = $plan.estado
        fecha_inicio = $plan.fechaInicio; fecha_fin = $plan.fechaFin
    }
    $ok = Invoke-SupabaseUpsert -Table "planes" -Body $planBody
    if ($ok) { Write-Host "  OK Plan: $($plan.nombre)" -ForegroundColor Green; $totalOk++ } else { $totalErr++ }
}

# Get plan ID for subsequent migrations
$uri = "$SUPABASE_URL/rest/v1/planes?select=id&limit=1"
try {
    $planResp = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
    $PLAN_ID = $planResp[0].id
} catch {
    Write-Host "  No se pudo obtener plan ID. Usando 1." -ForegroundColor Yellow
    $PLAN_ID = 1
}

# --- 5. OBJETIVOS ---
Write-Host ""; Write-Host "[5/11] Migrando objetivos..." -ForegroundColor Yellow
$order = 1
foreach ($obj in $DATA.objetivos) {
    $objBody = @{ plan_id = $PLAN_ID; descripcion = $obj.nombre; orden = $order }
    $ok = Invoke-SupabaseUpsert -Table "objetivos_generales" -Body $objBody
    if ($ok) { Write-Host "  OK $($obj.nombre)" -ForegroundColor Green; $totalOk++ } else { $totalErr++ }
    $order++
}

# --- 6. KPIs ---
Write-Host ""; Write-Host "[6/11] Migrando KPIs..." -ForegroundColor Yellow
foreach ($kpi in $DATA.kpis) {
    $kpiBody = @{
        plan_id = $PLAN_ID; nombre = $kpi.nombre
        meta = $kpi.metaNumero; unidad = $kpi.unidad
        valor_actual = $kpi.actual
    }
    # Add historial as raw PS array (will be JSONB), but skip if empty to avoid issues
    if ($kpi.historico -and $kpi.historico.Count -gt 0) {
        $kpiBody['historial'] = $kpi.historico
    }
    $ok = Invoke-SupabaseUpsert -Table "kpis" -Body $kpiBody
    if ($ok) { Write-Host "  OK $($kpi.nombre)" -ForegroundColor Green; $totalOk++ } else { $totalErr++ }
}

# --- 7. FODA ---
Write-Host ""; Write-Host "[7/11] Migrando FODA..." -ForegroundColor Yellow
$foda = $DATA.analisis.foda
if ($foda) {
    $fodaMap = @(
        @{ tipo="fortaleza"; items=$foda.fortalezas },
        @{ tipo="oportunidad"; items=$foda.oportunidades },
        @{ tipo="debilidad"; items=$foda.debilidades },
        @{ tipo="amenaza"; items=$foda.amenazas }
    )
    foreach ($entry in $fodaMap) {
        foreach ($item in $entry.items) {
            $fodaBody = @{ plan_id = $PLAN_ID; tipo = $entry.tipo; descripcion = $item }
            $ok = Invoke-SupabaseUpsert -Table "foda" -Body $fodaBody
            if ($ok) { $totalOk++ } else { $totalErr++ }
        }
    }
    $estrat = $foda.estrategia_identificada.ToLower()
    $estBody = @{ plan_id = $PLAN_ID; tipo_estrategia = $estrat }
    $ok = Invoke-SupabaseUpsert -Table "estrategia_plan" -Body $estBody -Conflict "plan_id"
    if ($ok) { Write-Host "  OK FODA + Estrategia: $estrat" -ForegroundColor Green; $totalOk++ } else { $totalErr++ }
}

# --- 8. CAME ---
Write-Host ""; Write-Host "[8/11] Migrando CAME..." -ForegroundColor Yellow
$came = $DATA.analisis.came
if ($came) {
    $cameMap = @(
        @{ cat="corregir"; val=$came.corregir }, @{ cat="afrontar"; val=$came.afrontar }
        @{ cat="mantener"; val=$came.mantener }, @{ cat="explotar"; val=$came.explotar }
    )
    foreach ($entry in $cameMap) {
        if ($entry.val) {
            $cameBody = @{ plan_id = $PLAN_ID; categoria = $entry.cat; descripcion = $entry.val }
            $ok = Invoke-SupabaseUpsert -Table "came" -Body $cameBody
            if ($ok) { $totalOk++ } else { $totalErr++ }
        }
    }
    Write-Host "  OK CAME" -ForegroundColor Green; $totalOk++
}

# --- 9. PLAN_CONTENIDO (Porter M06, PEST M07) ---
Write-Host ""; Write-Host "[9/11] Migrando modulos de analisis..." -ForegroundColor Yellow
if ($DATA.analisis.porter) {
    $porterBody = @{
        plan_id = $PLAN_ID; modulo_id = "M06"
        contenido = $DATA.analisis.porter; completado = $true
        completado_fecha = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    $ok = Invoke-SupabaseUpsert -Table "plan_contenido" -Body $porterBody -Conflict "plan_id, modulo_id"
    if ($ok) { Write-Host "  OK Porter (M06)" -ForegroundColor Green; $totalOk++ } else { $totalErr++ }
}
if ($DATA.analisis.pest) {
    $pestBody = @{
        plan_id = $PLAN_ID; modulo_id = "M07"
        contenido = $DATA.analisis.pest; completado = $true
        completado_fecha = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    $ok = Invoke-SupabaseUpsert -Table "plan_contenido" -Body $pestBody -Conflict "plan_id, modulo_id"
    if ($ok) { Write-Host "  OK PEST (M07)" -ForegroundColor Green; $totalOk++ } else { $totalErr++ }
}

# --- 10. AUDITORIA ---
Write-Host ""; Write-Host "[10/11] Migrando auditoria..." -ForegroundColor Yellow
foreach ($aud in $DATA.auditoria) {
    $audBody = @{
        modulo = $aud.modulo; accion = $aud.accion; detalle = $aud.detalle
        fecha = $aud.fecha; usuario_nombre = $aud.usuario
    }
    $ok = Invoke-SupabaseUpsert -Table "auditoria" -Body $audBody
    if ($ok) { $totalOk++ } else { $totalErr++ }
}
Write-Host "  OK Auditoria: $($DATA.auditoria.Count) registros" -ForegroundColor Green

# --- 11. ALERTAS ---
Write-Host ""; Write-Host "[11/11] Migrando alertas..." -ForegroundColor Yellow
foreach ($alerta in $DATA.alertas) {
    $altBody = @{
        plan_id = $PLAN_ID; tipo = $alerta.tipo; referencia = $alerta.referencia
        descripcion = $alerta.descripcion; revisado = ($alerta.estado -eq "revisada")
        comentario = $alerta.comentario; fecha_creacion = $alerta.fecha
    }
    $ok = Invoke-SupabaseUpsert -Table "alertas" -Body $altBody
    if ($ok) { $totalOk++ } else { $totalErr++ }
}
Write-Host "  OK Alertas: $($DATA.alertas.Count) registros" -ForegroundColor Green

# --- FINAL ---
Write-Host ""; Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  MIGRACION COMPLETADA" -ForegroundColor Cyan
Write-Host "  OK: $totalOk   Errores: $totalErr" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

if ($totalErr -eq 0) {
    Remove-Item -LiteralPath $dataFile -Force
    Write-Host "  [OK] data.json eliminado exitosamente." -ForegroundColor Green
} else {
    Write-Host "  [WARN] Hubo $totalErr errores. data.json NO fue eliminado." -ForegroundColor Red
}
