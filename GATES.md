# Gates: GTDIB media archive on gtdib.org

Scope: 15 unique media-coverage items archived on the website as a
labeled "Mediada bizim haqqımızda" section — Supabase `news` rows with
`kind='media'`, `source_url` to the original outlet, and self-hosted
images under `news-gallery/media-archive/`. Duplicate outlet copies of
the same story were removed (one entry per story).

- [x] G1: All 15 archive images exist in the repo and are real image bytes
  CHECK: cd /Users/ricci/ipek-yolu-irs/news-gallery/media-archive && c=0 && for f in *; do t=$(file -b "$f"); case "$t" in JPEG*|PNG*|Web/P*|RIFF*) c=$((c+1));; *) echo "BAD $f";; esac; done; echo "valid=$c"; test "$c" -eq 15
  EXPECT: valid=15
  EVIDENCE: automatic-evidence=v1; definition-sha256=9b965e3e43cc41f2ecea61a29097143a36fc1b7342c5415c985d2e36d4120ac6; exit=0; EXPECT=matched; output-sha256=b4f349af30c7517db773a4e573b61b65a6f70e6e2ba5e902ff98888e1d0b4489; output-bytes=9; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G2: Every archive image is ≥450px wide and >9KB
  CHECK: cd /Users/ricci/ipek-yolu-irs/news-gallery/media-archive && ok=0; for f in *; do w=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/{print $2}'); s=$(stat -f%z "$f"); if [ "${w:-0}" -ge 450 ] && [ "$s" -gt 9000 ]; then ok=$((ok+1)); else echo "SMALL $f $w $s"; fi; done; echo "ok=$ok"; test "$ok" -eq 15
  EXPECT: ok=15
  EVIDENCE: automatic-evidence=v1; definition-sha256=647b515cf63989c69285632e9b0fc9dcc7246d4f9325707b722d0c5d4aa39394; exit=0; EXPECT=matched; output-sha256=0eeff07badd4fe580fb53980bcade2c07c086cad7fa6b0c9b31173e605a19d36; output-bytes=6; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G3: 15 media rows visible through the anonymous Supabase API
  CHECK: curl -s "https://glfizcgayqecnvtfihgy.supabase.co/rest/v1/news?select=id&kind=eq.media&is_published=eq.true" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I" | python3 -c "import json,sys; n=len(json.load(sys.stdin)); print('rows=%d'%n); exit(0 if n==15 else 1)"
  EXPECT: rows=15
  EVIDENCE: automatic-evidence=v1; definition-sha256=d361ec59bd8229af7621681175a39a3e0fa21de87f9e61b0cbdd389c008fe0a0; exit=0; EXPECT=matched; output-sha256=b59e022fa3e12f50742248e898713e1fec9a265c085d576c3a50ca36cda75c72; output-bytes=8; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G4: Live news page returns 200 and contains the media-archive section markup
  CHECK: curl -sL -o /tmp/news_live.html -w 'code=%{http_code}\n' https://gtdib.org/news.html && grep -c 'media-list' /tmp/news_live.html | xargs -I{} sh -c 'echo "marks={}"; test {} -ge 1'
  EXPECT: marks=
  EVIDENCE: automatic-evidence=v1; definition-sha256=507b75fbb7f9730056b0768c918798adb2cc0dbbd25265102922cc1ad8a60adf; exit=0; EXPECT=matched; output-sha256=efceda63fcd0e98372b7273b432078fa4ae34f3f7716f3d8e483af170e86cbe1; output-bytes=17; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G5: Live archive images load over HTTPS on gtdib.org
  CHECK: c=0; for n in 01.jpg 14.jpg 33.jpg 36.webp; do code=$(curl -s -o /dev/null -w '%{http_code}' "https://gtdib.org/news-gallery/media-archive/$n"); [ "$code" = "200" ] && c=$((c+1)); echo "$n=$code"; done; echo "ok=$c"; test "$c" -eq 4
  EXPECT: ok=4
  EVIDENCE: automatic-evidence=v1; definition-sha256=ebe649abfc44905d8794d6194093f8a93138c0fbf42657833a9cfc8884bccbb7; exit=0; EXPECT=matched; output-sha256=e4cd25a7469ce00437743576d78221d831fa7ad61cf0b671e3a0a34727a037d5; output-bytes=50; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G6: A media row exposes title + published date + source link via the anonymous API
  CHECK: curl -s "https://glfizcgayqecnvtfihgy.supabase.co/rest/v1/news?select=title_az,published_at,source_url&kind=eq.media&source_url=like.*sia.az*&limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I" | python3 -c "import json,sys; d=json.load(sys.stdin); r=d[0]; print('ROWVISIBLE', r['title_az'][:30], r['published_at'], r['source_url']); assert r['title_az'] and r['published_at'] and 'sia.az' in r['source_url']"
  EXPECT: ROWVISIBLE
  EVIDENCE: automatic-evidence=v1; definition-sha256=65584e8498133ea5e5830608046f2df8a76c9fadf29837c6f0da54f45f3af070; exit=0; EXPECT=matched; output-sha256=c0fa2f8206420818600c21fe5b0a356c484dccbb4dd46f563a83ee341982fea4; output-bytes=116; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries
