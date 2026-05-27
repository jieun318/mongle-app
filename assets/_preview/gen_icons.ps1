Add-Type -AssemblyName System.Drawing

$src = "c:\Users\pje\mongle-app\assets\images\mongi0.png"
$outDir = "c:\Users\pje\mongle-app\assets\_preview"

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

function New-Icon {
    param([string]$Out, [int]$Size, [string]$TopHex, [string]$BottomHex, [double]$MascotScale, [System.Drawing.Bitmap]$Mascot)
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
    $c1 = [System.Drawing.ColorTranslator]::FromHtml($TopHex)
    $c2 = [System.Drawing.ColorTranslator]::FromHtml($BottomHex)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 90)
    $g.FillRectangle($brush, $rect)
    $longer = [Math]::Max($Mascot.Width, $Mascot.Height)
    $target = [int]($Size * $MascotScale)
    $scale = $target / $longer
    $w = [int]($Mascot.Width * $scale)
    $h = [int]($Mascot.Height * $scale)
    $x = ($Size - $w) / 2
    $y = ($Size - $h) / 2
    $g.DrawImage($Mascot, $x, $y, $w, $h)
    $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $brush.Dispose()
}

$mascot = Get-TrimmedMascot -Path $src
Write-Output "trimmed mascot: $($mascot.Width) x $($mascot.Height)"

New-Icon -Mascot $mascot -Out "$outDir\icon_v1_soft.png" -Size 1024 -TopHex "#F0E8FF" -BottomHex "#D4C4F0" -MascotScale 0.85
New-Icon -Mascot $mascot -Out "$outDir\icon_v2_mid.png" -Size 1024 -TopHex "#C7B8E8" -BottomHex "#9888CC" -MascotScale 0.82
New-Icon -Mascot $mascot -Out "$outDir\icon_v3_brand.png" -Size 1024 -TopHex "#9888CC" -BottomHex "#5C4A9C" -MascotScale 0.80

$mascot.Dispose()
Write-Output "done"
