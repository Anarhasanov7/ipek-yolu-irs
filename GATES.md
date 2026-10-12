# Gates: GTDIB media archive on gtdib.org

Scope: 9 unique media-coverage items archived on the website as a
labeled "Mediada bizim haqqımızda" section — Supabase `news` rows with
`kind='media'`, `source_url` to the original outlet, and self-hosted
images under `news-gallery/media-archive/`. Duplicate outlet copies of
the same story were removed (one entry per story).

- [x] G1: All 9 archive images exist in the repo and are real image bytes
  CHECK: cd /Users/ricci/ipek-yolu-irs/news-gallery/media-archive && c=0 && for f in *; do t=$(file -b "$f"); case "$t" in JPEG*|PNG*|Web/P*|RIFF*) c=$((c+1));; *) echo "BAD $f";; esac; done; echo "valid=$c"; test "$c" -eq 9
  EXPECT: valid=9
  EVIDENCE: automatic-evidence=v1; definition-sha256=6becfc82a6677f06946fff5a45d0c375b65de320dda5d7646122bc99e4d83423; exit=0; EXPECT=matched; output-sha256=4f827518e1cc1f1f2d37d29e3dff72faf22b4e9663abf492a733ca0702fb50c1; output-bytes=9; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G2: Every archive image is ≥450px wide and >9KB
  CHECK: cd /Users/ricci/ipek-yolu-irs/news-gallery/media-archive && ok=0; for f in *; do w=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/{print $2}'); s=$(stat -f%z "$f"); if [ "${w:-0}" -ge 450 ] && [ "$s" -gt 9000 ]; then ok=$((ok+1)); else echo "SMALL $f $w $s"; fi; done; echo "ok=$ok"; test "$ok" -eq 9
  EXPECT: ok=9
  EVIDENCE: automatic-evidence=v1; definition-sha256=d8a6c75cd890f4248c6f5a9242c0447db18b76bb07078adf7980d268cdc71b4e; exit=0; EXPECT=matched; output-sha256=b6c8a431022caf6370cc6fc9e5890869dacdf617961f1d6dd7766806cfd2bf42; output-bytes=6; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G3: 9 media rows visible through the anonymous Supabase API
  CHECK: curl -s "https://glfizcgayqecnvtfihgy.supabase.co/rest/v1/news?select=id&kind=eq.media&is_published=eq.true" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I" | python3 -c "import json,sys; n=len(json.load(sys.stdin)); print('rows=%d'%n); exit(0 if n==9 else 1)"
  EXPECT: rows=9
  EVIDENCE: automatic-evidence=v1; definition-sha256=fa94e5e845602e3f1868e0df8ffc956bc4ae324e303714c6de773a25470e172f; exit=0; EXPECT=matched; output-sha256=ae8e1f22f737f35b7309ef7e50653dd023e9a98eb8c780dea222a142fabfb102; output-bytes=8; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G4: Live news page returns 200 and contains the media-archive section markup
  CHECK: curl -sL -o /tmp/news_live.html -w 'code=%{http_code}\n' https://gtdib.org/news.html && grep -c 'media-list' /tmp/news_live.html | xargs -I{} sh -c 'echo "marks={}"; test {} -ge 1'
  EXPECT: marks=
  EVIDENCE: automatic-evidence=v1; definition-sha256=507b75fbb7f9730056b0768c918798adb2cc0dbbd25265102922cc1ad8a60adf; exit=0; EXPECT=matched; output-sha256=efceda63fcd0e98372b7273b432078fa4ae34f3f7716f3d8e483af170e86cbe1; output-bytes=17; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G5: Live archive images load over HTTPS on gtdib.org
  CHECK: c=0; for n in 09.jpg 14.jpg 31.jpg 36.webp; do code=$(curl -s -o /dev/null -w '%{http_code}' "https://gtdib.org/news-gallery/media-archive/$n"); [ "$code" = "200" ] && c=$((c+1)); echo "$n=$code"; done; echo "ok=$c"; test "$c" -eq 4
  EXPECT: ok=4
  EVIDENCE: automatic-evidence=v1; definition-sha256=0944e95349dd34b6ec1b7fdc0eb7ae9123568273d4f5c4c5e09db8aaf7ceb50d; exit=0; EXPECT=matched; output-sha256=ad8c96dfb2ccd7e17419ccaaf579b530e0639874b38f252c25b1bde807c2ae2d; output-bytes=50; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G6: A media row exposes title + published date + source link via the anonymous API
  CHECK: curl -s "https://glfizcgayqecnvtfihgy.supabase.co/rest/v1/news?select=title_az,published_at,source_url&kind=eq.media&source_url=like.*sia.az*&limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I" | python3 -c "import json,sys; d=json.load(sys.stdin); r=d[0]; print('ROWVISIBLE', r['title_az'][:30], r['published_at'], r['source_url']); assert r['title_az'] and r['published_at'] and 'sia.az' in r['source_url']"
  EXPECT: ROWVISIBLE
  EVIDENCE: automatic-evidence=v1; definition-sha256=65584e8498133ea5e5830608046f2df8a76c9fadf29837c6f0da54f45f3af070; exit=0; EXPECT=matched; output-sha256=c0fa2f8206420818600c21fe5b0a356c484dccbb4dd46f563a83ee341982fea4; output-bytes=116; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries
