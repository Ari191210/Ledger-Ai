$paths = @(
  '/journey','/journey/academics','/journey/testing','/journey/activities',
  '/journey/projects','/journey/opportunities','/journey/colleges',
  '/journey/applications','/journey/essays','/journey/calendar','/journey/profile'
)

# Each route must render its own heading. Checking for a generic marker is
# not enough: Next inlines its 404 template into every RSC payload, so
# searching the raw body for error strings gives a false positive on a
# perfectly healthy page. Asserting on the page's own <h1> proves the
# component actually mounted and produced its content.
$expect = @{
  # The home page is intentionally SSR-safe: the server renders the
  # pre-hydration placeholder ("Your journey") and the personalised greeting
  # only appears after the local store is read on the client. Asserting on
  # the greeting here would be asserting on a hydration mismatch.
  '/journey'               = '<h1[^>]*>Your journey<'
  '/journey/academics'     = '<h1[^>]*>Academics<'
  '/journey/testing'       = '<h1[^>]*>Testing<'
  '/journey/activities'    = '<h1[^>]*>Activities<'
  '/journey/projects'      = '<h1[^>]*>Projects<'
  '/journey/opportunities' = '<h1[^>]*>Opportunities<'
  '/journey/colleges'      = '<h1[^>]*>Colleges<'
  '/journey/applications'  = '<h1[^>]*>Applications<'
  '/journey/essays'        = '<h1[^>]*>Essays<'
  '/journey/calendar'      = '<h1[^>]*>Calendar<'
  '/journey/profile'       = '<h1[^>]*>Profile<'
}

$fail = 0
foreach ($p in $paths) {
  try {
    $r = Invoke-WebRequest -Uri ('http://localhost:3000' + $p) -TimeoutSec 180 -UseBasicParsing
    $c = $r.Content
    $notes = @()
    if ($c -notmatch $expect[$p])          { $notes += 'NO-HEADING' }
    # The shell's nav must be present on every journey route.
    if ($c -notmatch 'Opportunities')      { $notes += 'NO-NAV' }
    # A real client crash surfaces this; the inlined 404 template does not.
    if ($c -match 'Application error: a client-side exception') { $notes += 'CLIENT-CRASH' }
    $state = if ($notes.Count) { $notes -join ',' } else { 'ok' }
    if ($state -ne 'ok') { $fail++ }
    Write-Output ("{0} {1} len={2} {3}" -f $r.StatusCode, $p, $c.Length, $state)
  } catch {
    $fail++
    Write-Output ("ERR {0} :: {1}" -f $p, $_.Exception.Message)
  }
}
Write-Output ("--- failures: {0}" -f $fail)
