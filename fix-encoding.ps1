$files = Get-ChildItem -Path "public" -Include "*.html","*.js","*.css","*.json" -Recurse |
    Where-Object { $_.FullName -notmatch '\.history' }

$enc = New-Object System.Text.UTF8Encoding($false)
$totalFixed = 0

foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $hasBOM = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    # Letras acentuadas portuguesas
    $content = $content -replace 'Ã£','ã'
    $content = $content -replace 'Ã¢','â'
    $content = $content -replace 'Ã¡','á'
    $content = $content -replace 'Ã ','à'
    $content = $content -replace 'Ã§','ç'
    $content = $content -replace 'Ã©','é'
    $content = $content -replace 'Ãª','ê'
    $content = $content -replace 'Ã¨','è'
    $content = $content -replace 'Ã­','í'
    $content = $content -replace 'Ã®','î'
    $content = $content -replace 'Ã³','ó'
    $content = $content -replace 'Ã´','ô'
    $content = $content -replace 'Ãµ','õ'
    $content = $content -replace 'Ãº','ú'
    $content = $content -replace 'Ã»','û'
    $content = $content -replace 'Ã±','ñ'
    $content = $content -replace 'Ã€','À'
    $content = $content -replace 'Ã‚','Â'
    $content = $content -replace 'Ã‡','Ç'
    $content = $content -replace 'Ã‰','É'
    $content = $content -replace 'ÃŠ','Ê'
    $content = $content -replace 'Ã"','Ó'
    $content = $content -replace 'Ã•','Õ'
    $content = $content -replace 'Ãš','Ú'
    $content = $content -replace 'Ã¯','ï'
    $content = $content -replace 'Ã¼','ü'
    $content = $content -replace 'Ã—','×'

    # Pontuacao e simbolos
    $content = $content -replace 'â€™',"'"
    $content = $content -replace 'â€˜',"'"
    $content = $content -replace 'â€¢','•'
    $content = $content -replace 'â€"','–'
    $content = $content -replace 'â€"','—'
    $content = $content -replace 'â€¦','…'
    $content = $content -replace 'Â«','«'
    $content = $content -replace 'Â»','»'
    $content = $content -replace 'Â·','·'
    $content = $content -replace 'Â°','°'
    $content = $content -replace 'Â©','©'
    $content = $content -replace 'Â®','®'
    $content = $content -replace 'Â±','±'
    $content = $content -replace 'Âµ','µ'
    $content = $content -replace 'Â¿','¿'
    $content = $content -replace 'Â¡','¡'
    $content = $content -replace 'Â ','_NBSP_'
    $content = $content -replace '_NBSP_',' '
    $content = $content -replace 'â˜…','★'
    $content = $content -replace 'â˜†','☆'
    $content = $content -replace 'â¤','❤'
    $content = $content -replace 'âœ"','✓'
    $content = $content -replace 'âœ—','✗'

    # Sequencias compostas portuguesas mais comuns
    $content = $content -replace 'Ã§Ã£o','ção'
    $content = $content -replace 'Ã§Ãµes','ções'
    $content = $content -replace 'Ã£o','ão'
    $content = $content -replace 'Ã£es','ães'
    $content = $content -replace 'vocÃª','você'
    $content = $content -replace 'tambÃ©m','também'
    $content = $content -replace 'histÃ³ria','história'
    $content = $content -replace 'Ã©s','és'
    $content = $content -replace 'â€œ','"'
    $content = $content -replace 'â€ ','"'
    
    # Emojis corrompidos - padrao ð (U+00F0) seguido de chars
    # Reencoda de latin1 corrompido para UTF-8 real via regex generica
    # Detecta o padrao de emoji quebrado: ðŸ seguido de qualquer char
    $content = $content -replace 'ðŸ˜€','😀'
    $content = $content -replace 'ðŸ˜','😊'
    $content = $content -replace 'ðŸ"','📝'
    $content = $content -replace 'ðŸ"¢','📢'
    $content = $content -replace 'ðŸ"',"🔔"
    $content = $content -replace 'ðŸ'¬','💬'
    $content = $content -replace 'ðŸ'¥','💥'
    $content = $content -replace 'ðŸŽ‰','🎉'
    $content = $content -replace 'ðŸš€','🚀'
    $content = $content -replace 'ðŸŒ','🌐'
    $content = $content -replace 'ðŸ†','🏆'
    $content = $content -replace 'ðŸŒŸ','🌟'
    $content = $content -replace 'ðŸ'«','💫'
    $content = $content -replace 'ðŸ"—','🔗'
    $content = $content -replace 'ðŸ'Ž','👎'
    $content = $content -replace 'ðŸ'','👍'
    $content = $content -replace 'ðŸ''','👑'
    $content = $content -replace 'ðŸ'¡','💡'
    $content = $content -replace 'ðŸ"','🔍'
    $content = $content -replace 'ðŸ—''','🗑'
    $content = $content -replace 'ðŸ–Š','🖊'
    $content = $content -replace 'ðŸ'Ž','👎'
    $content = $content -replace 'ðŸ"',"🔔"

    $changed = ($content -ne $original) -or $hasBOM

    if ($changed) {
        [System.IO.File]::WriteAllText($file.FullName, $content, $enc)
        $totalFixed++
        Write-Host ("CORRIGIDO: " + $file.Name)
    }
}

Write-Host ""
Write-Host ("Total arquivos corrigidos: " + $totalFixed)
