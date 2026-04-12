Add-Type -AssemblyName System.Drawing

function Resize-Image($src, $dest, $w, $h) {
    if (Test-Path $src) {
        $img = [System.Drawing.Image]::FromFile($src)
        $newImg = new-object System.Drawing.Bitmap($w, $h)
        $g = [System.Drawing.Graphics]::FromImage($newImg)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $w, $h)
        $g.Dispose()
        $img.Dispose() # Close source before saving to same path
        
        $tempDest = "$dest.tmp.png"
        $newImg.Save($tempDest, [System.Drawing.Imaging.ImageFormat]::Png)
        $newImg.Dispose()
        
        Move-Item -Path $tempDest -Destination $dest -Force
        Write-Host "Correctly Resized $src ($w x $h) -> $dest"
    } else {
        Write-Error "Source not found: $src"
    }
}

Resize-Image "public/screenshot-mobile.png" "public/screenshot-mobile.png" 540 1170
Resize-Image "public/screenshot-desktop.png" "public/screenshot-desktop.png" 1280 800
