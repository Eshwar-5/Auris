Add-Type -AssemblyName System.Drawing

function Resize-Image($src, $dest, $w, $h) {
    if (Test-Path $src) {
        $img = $null
        $newImg = $null
        $g = $null
        $tempDest = "$dest.tmp.png"
        try {
            $img = [System.Drawing.Image]::FromFile($src)
            $newImg = new-object System.Drawing.Bitmap($w, $h)
            $g = [System.Drawing.Graphics]::FromImage($newImg)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.DrawImage($img, 0, 0, $w, $h)
            
            # Dispose Graphics early before saving
            $g.Dispose(); $g = $null 
            
            $newImg.Save($tempDest, [System.Drawing.Imaging.ImageFormat]::Png)
            
            # Dispose everything before moving to avoid locks
            $newImg.Dispose(); $newImg = $null
            $img.Dispose(); $img = $null
            
            Move-Item -Path $tempDest -Destination $dest -Force
            Write-Host "Correctly Resized $src ($w x $h) -> $dest"
        }
        catch {
            Write-Error "Failed to resize $src: $($_.Exception.Message)"
            if (Test-Path $tempDest) { Remove-Item $tempDest -Force }
        }
        finally {
            if ($null -ne $g) { $g.Dispose() }
            if ($null -ne $newImg) { $newImg.Dispose() }
            if ($null -ne $img) { $img.Dispose() }
        }
    } else {
        Write-Error "Source not found: $src"
    }
}

Resize-Image "public/screenshot-mobile.png" "public/screenshot-mobile.png" 540 1170
Resize-Image "public/screenshot-desktop.png" "public/screenshot-desktop.png" 1280 800
