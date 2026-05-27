Add-Type -AssemblyName System.Drawing

$src = "c:\Users\pje\mongle-app\assets\images\mongi0.png"
$outDir = "c:\Users\pje\mongle-app\assets\_preview"

# V2 톤 (확정)
$TOP = "#C7B8E8"
$BOTTOM = "#9888CC"
$MID = "#B0A0DD"   # Android adaptive 배경용

function Get-TrimmedMascot {
    param([string]$Path)
    $img = [System.Drawing.Bitmap]::FromFile($Path)
    $w = $img.Width; $h = $img.Height
    $minX = $w; $minY = $h; $maxX = 0; $maxY = 0
    for ($y = 0; $y -lt $h; $y += 2) {
        for ($x = 0; $x -lt $w; $x += 2) {
            $p = $img.GetPixel($x, $y)
            $notWhite = ($p.R -lt 245) -or ($p.G -lt 245) -or ($p.B -lt 245)
            if ($p.A -gt 30 -and $notWhite) {
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    $pad = 8
    $minX = [Math]::Max(0, $minX - $pad)
    $minY = [Math]::Max(0, $minY - $pad)
    $maxX = [Math]::Min($w - 1, $maxX + $pad)
    $maxY = [Math]::Min($h - 1, $maxY + $pad)
    $cropW = $maxX - $minX + 1
    $cropH = $maxY - $minY + 1
    $crop = New-Object System.Drawing.Bitmap $cropW, $cropH
    $g = [System.Drawing.Graphics]::FromImage($crop)
    $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH), (New-Object System.Drawing.Rectangle $minX, $minY, $cropW, $cropH), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose(); $img.Dispose()
    return $crop
}

function Set-HighQuality {
    param($Graphics)
    $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $Graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
}

# 1) iOS / 메인 앱 아이콘 — 그라데이션 + 마스코트
function New-AppIcon {
    param([string]$Out, [System.Drawing.Bitmap]$Mascot)
    $size = 1024
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    Set-HighQuality $g
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $c1 = [System.Drawing.ColorTranslator]::FromHtml($TOP)
    $c2 = [System.Drawing.ColorTranslator]::FromHtml($BOTTOM)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 90)
    $g.FillRectangle($brush, $rect)
    $longer = [Math]::Max($Mascot.Width, $Mascot.Height)
    $target = [int]($size * 0.82)
    $scale = $target / $longer
    $w = [int]($Mascot.Width * $scale)
    $h = [int]($Mascot.Height * $scale)
    $g.DrawImage($Mascot, ($size - $w) / 2, ($size - $h) / 2, $w, $h)
    $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $brush.Dispose()
}

# 2) Android adaptive foreground — 투명 배경, 마스코트만 (safe zone 고려해 65%)
function New-AdaptiveIcon {
    param([string]$Out, [System.Drawing.Bitmap]$Mascot)
    $size = 1024
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    Set-HighQuality $g
    $g.Clear([System.Drawing.Color]::Transparent)
    $longer = [Math]::Max($Mascot.Width, $Mascot.Height)
    $target = [int]($size * 0.65)
    $scale = $target / $longer
    $w = [int]($Mascot.Width * $scale)
    $h = [int]($Mascot.Height * $scale)
    $g.DrawImage($Mascot, ($size - $w) / 2, ($size - $h) / 2, $w, $h)
    $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}

# 3) 스플래시 — 세로 그라데이션 + 마스코트 + "몽글" 워드마크
function New-Splash {
    param([string]$Out, [System.Drawing.Bitmap]$Mascot)
    $W = 1242; $H = 2436   # iPhone X 스펙 — cover 모드로 다른 해상도 폰에서도 안전
    $bmp = New-Object System.Drawing.Bitmap $W, $H
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    Set-HighQuality $g
    $rect = New-Object System.Drawing.Rectangle 0, 0, $W, $H
    $c1 = [System.Drawing.ColorTranslator]::FromHtml($TOP)
    $c2 = [System.Drawing.ColorTranslator]::FromHtml($BOTTOM)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 90)
    $g.FillRectangle($brush, $rect)

    # 마스코트 — 화면 가로의 55%, 약간 위쪽 (세로 38% 지점에 중심)
    $longer = [Math]::Max($Mascot.Width, $Mascot.Height)
    $target = [int]($W * 0.55)
    $scale = $target / $longer
    $mw = [int]($Mascot.Width * $scale)
    $mh = [int]($Mascot.Height * $scale)
    $mx = ($W - $mw) / 2
    $my = [int]($H * 0.38) - $mh / 2
    $g.DrawImage($Mascot, $mx, $my, $mw, $mh)

    # "몽글" 워드마크 — 마스코트 아래, 흰색
    $fontFamily = "Malgun Gothic"
    try {
        $font = New-Object System.Drawing.Font($fontFamily, 96, [System.Drawing.FontStyle]::Bold)
    } catch {
        $font = New-Object System.Drawing.Font("Arial", 96, [System.Drawing.FontStyle]::Bold)
    }
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $text = "몽글"
    $textY = $my + $mh + 60
    $g.DrawString($text, $font, $whiteBrush, [float]($W / 2), [float]$textY, $sf)

    # 태그라인 — "오늘의 운세와 꿈해몽"
    try {
        $smallFont = New-Object System.Drawing.Font($fontFamily, 36, [System.Drawing.FontStyle]::Regular)
    } catch {
        $smallFont = New-Object System.Drawing.Font("Arial", 36, [System.Drawing.FontStyle]::Regular)
    }
    $softBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 255, 255, 255))
    $g.DrawString("오늘의 운세와 꿈해몽", $smallFont, $softBrush, [float]($W / 2), [float]($textY + 140), $sf)

    $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $font.Dispose(); $smallFont.Dispose(); $whiteBrush.Dispose(); $softBrush.Dispose()
    $g.Dispose(); $bmp.Dispose(); $brush.Dispose()
}

$mascot = Get-TrimmedMascot -Path $src
Write-Output "trimmed mascot: $($mascot.Width) x $($mascot.Height)"

New-AppIcon -Mascot $mascot -Out "$outDir\appicon_final.png"
New-AdaptiveIcon -Mascot $mascot -Out "$outDir\adaptive_final.png"
New-Splash -Mascot $mascot -Out "$outDir\splash_final.png"

$mascot.Dispose()
Write-Output "done"
