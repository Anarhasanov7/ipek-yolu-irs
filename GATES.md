# Gates: GTDIB media archive on gtdib.org

Scope: 9 unique media-coverage items archived on the website as a
labeled "Mediada bizim haqqımızda" section — Supabase `news` rows with
`kind='media'`, `source_url` to the original outlet, and self-hosted
images under `news-gallery/media-archive/`. Duplicate outlet copies of
the same story were removed (one entry per story).

- [x] G1: All 9 archive images exist in the repo and are real image bytes
  CHECK: cd /Users/ricci/ipek-yolu-irs/news-gallery/media-archive && c=0 && for f in *; do t=$(file -b "$f"); case "$t" in JPEG*|PNG*|Web/P*|RIFF*) c=$((c+1));; *) echo "BAD $f";; esac; done; echo "valid=$c"; test "$c" -eq 9
  EXPECT: valid=9
  EVIDENCE: automatic-evidence=v1; definition-sha256=b5036d8b0456b14d9e898458779b784c3d3129b2f22b3d09507976d0ad3f1693; exit=0; EXPECT=matched; output-sha256=554b9c74f98cfa508251297ab05f6c90bf252608d46fa82a54864b3c412adc26; output-bytes=8; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G2: Every archive image is ≥450px wide and >9KB
  CHECK: cd /Users/ricci/ipek-yolu-irs/news-gallery/media-archive && ok=0; for f in *; do w=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/{print $2}'); s=$(stat -f%z "$f"); if [ "${w:-0}" -ge 450 ] && [ "$s" -gt 9000 ]; then ok=$((ok+1)); else echo "SMALL $f $w $s"; fi; done; echo "ok=$ok"; test "$ok" -eq 9
  EXPECT: ok=9
  EVIDENCE: automatic-evidence=v1; definition-sha256=33de76e6d32e9ffea165d312054744d03828c49deb9e6934b7a7a4204fa23579; exit=0; EXPECT=matched; output-sha256=28ae6f4295b261047ca8b812075553bb70357048486a30c7464ec63b4cc1781e; output-bytes=5; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [ ] G3: 9 media rows visible through the anonymous Supabase API
  CHECK: curl -s "https://glfizcgayqecnvtfihgy.supabase.co/rest/v1/news?select=id&kind=eq.media&is_published=eq.true" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I" | python3 -c "import json,sys; n=len(json.load(sys.stdin)); print('rows=%d'%n); exit(0 if n==9 else 1)"
  EXPECT: rows=9
  EVIDENCE: pending

- [x] G4: Live news page returns 200 and contains the media-archive section markup
  CHECK: curl -sL -o /tmp/news_live.html -w 'code=%{http_code}\n' https://gtdib.org/news.html && grep -c 'media-list' /tmp/news_live.html | xargs -I{} sh -c 'echo "marks={}"; test {} -ge 1'
  EXPECT: marks=
  EVIDENCE: automatic-evidence=v1; definition-sha256=507b75fbb7f9730056b0768c918798adb2cc0dbbd25265102922cc1ad8a60adf; exit=0; EXPECT=matched; output-sha256=efceda63fcd0e98372b7273b432078fa4ae34f3f7716f3d8e483af170e86cbe1; output-bytes=17; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G5: Live archive images load over HTTPS on gtdib.org
  CHECK: c=0; for n in 09.jpg 14.jpg 31.jpg 36.webp; do code=$(curl -s -o /dev/null -w '%{http_code}' "https://gtdib.org/news-gallery/media-archive/$n"); [ "$code" = "200" ] && c=$((c+1)); echo "$n=$code"; done; echo "ok=$c"; test "$c" -eq 4
  EXPECT: ok=4
  EVIDENCE: automatic-evidence=v1; definition-sha256=b78382ed1c9bb701566b916da49d1c90e8518c8d91f1204e2e23fab74be4548c; exit=0; EXPECT=matched; output-sha256=73e6d6ba77f05de991d2564a00d03d2d0d3c0f96f8bab7ccae072c8a4e7ad7a2; output-bytes=50; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [ ] G6: A media row exposes title + published date + source link via the anonymous API
  CHECK: curl -s "https://glfizcgayqecnvtfihgy.supabase.co/rest/v1/news?select=title_az,published_at,source_url&kind=eq.media&source_url=like.*sia.az*&limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I" | python3 -c "import json,sys; d=json.load(sys.stdin); r=d[0]; print('ROWVISIBLE', r['title_az'][:30], r['published_at'], r['source_url']); assert r['title_az'] and r['published_at'] and 'sia.az' in r['source_url']"
  EXPECT: ROWVISIBLE
  EVIDENCE: pending
