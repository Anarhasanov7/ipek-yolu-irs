# Gates: GTDIB media archive on gtdib.org

Scope: 36 media-coverage items archived on the website as a labeled
"Mediada bizim haqqımızda" section — Supabase `news` rows with
`kind='media'`, `source_url` to the original outlet, and self-hosted
images under `news-gallery/media-archive/`.

- [x] G1: All 36 archive images exist in the repo and are real image bytes
  CHECK: cd /Users/ricci/ipek-yolu-irs/news-gallery/media-archive && c=0 && for f in *; do t=$(file -b "$f"); case "$t" in JPEG*|PNG*|Web/P*|RIFF*) c=$((c+1));; *) echo "BAD $f";; esac; done; echo "valid=$c"; test "$c" -eq 36
  EXPECT: valid=36
  EVIDENCE: automatic-evidence=v1; definition-sha256=5d7eeb07c01cbfd194404df15ee9ab3d00f94728fcfe5fec8436bee14bcacc77; exit=0; EXPECT=matched; output-sha256=0b5c988c5ac75d24faf6ebe41a50b252d729b70069c66149a49b56d37d25b215; output-bytes=9; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G2: Every archive image is ≥450px wide and >9KB
  CHECK: cd /Users/ricci/ipek-yolu-irs/news-gallery/media-archive && ok=0; for f in *; do w=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/{print $2}'); s=$(stat -f%z "$f"); if [ "${w:-0}" -ge 450 ] && [ "$s" -gt 9000 ]; then ok=$((ok+1)); else echo "SMALL $f $w $s"; fi; done; echo "ok=$ok"; test "$ok" -eq 36
  EXPECT: ok=36
  EVIDENCE: automatic-evidence=v1; definition-sha256=846c79f34d888be90c166b9cdd723dfecd9918d4704295f23a049d29f8c055b3; exit=0; EXPECT=matched; output-sha256=eeca3b3d7c8da724278bdfe435895b0a3521f581807af08219453ea85955348e; output-bytes=6; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G3: 36 media rows visible through the anonymous Supabase API
  CHECK: curl -s "https://glfizcgayqecnvtfihgy.supabase.co/rest/v1/news?select=id&kind=eq.media&is_published=eq.true" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I" | python3 -c "import json,sys; n=len(json.load(sys.stdin)); print('rows=%d'%n); exit(0 if n==36 else 1)"
  EXPECT: rows=36
  EVIDENCE: automatic-evidence=v1; definition-sha256=da0ebb6dacbddadb2ad4d27b5e7072a0749c620499af963257d1cd5c8bf972b3; exit=0; EXPECT=matched; output-sha256=21666005c999eb28af89e9e1d38527410858042c121f3a1df543a73bae4fe584; output-bytes=8; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G4: Live news page returns 200 and contains the media-archive section markup
  CHECK: curl -sL -o /tmp/news_live.html -w 'code=%{http_code}\n' https://gtdib.org/news.html && grep -c 'media-list' /tmp/news_live.html | xargs -I{} sh -c 'echo "marks={}"; test {} -ge 1'
  EXPECT: marks=
  EVIDENCE: automatic-evidence=v1; definition-sha256=507b75fbb7f9730056b0768c918798adb2cc0dbbd25265102922cc1ad8a60adf; exit=0; EXPECT=matched; output-sha256=efceda63fcd0e98372b7273b432078fa4ae34f3f7716f3d8e483af170e86cbe1; output-bytes=17; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G5: Live archive images load over HTTPS on gtdib.org
  CHECK: c=0; for n in 01.jpg 14.jpg 35.jpg 36.webp; do code=$(curl -s -o /dev/null -w '%{http_code}' "https://gtdib.org/news-gallery/media-archive/$n"); [ "$code" = "200" ] && c=$((c+1)); echo "$n=$code"; done; echo "ok=$c"; test "$c" -eq 4
  EXPECT: ok=4
  EVIDENCE: automatic-evidence=v1; definition-sha256=7e10ad9742750e3c6148e291c70333f5c9bbc902373c0096acbd8da53459bded; exit=0; EXPECT=matched; output-sha256=a87f59a3c4945dd08883f47edab83db6f4960a1e4a4dbaab9a23b0c422bd3072; output-bytes=50; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries

- [x] G6: A media row exposes title + published date + source link via the anonymous API
  CHECK: curl -s "https://glfizcgayqecnvtfihgy.supabase.co/rest/v1/news?select=title_az,published_at,source_url&kind=eq.media&source_url=like.*sia.az*&limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZml6Y2dheXFlY252dGZpaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTAzMDUsImV4cCI6MjEwMzU4NjMwNX0.V9MiUESH7Xu1TG4tadkj9a7_wi-pouLPtv3yYTSEn0I" | python3 -c "import json,sys; d=json.load(sys.stdin); r=d[0]; print('ROWVISIBLE', r['title_az'][:30], r['published_at'], r['source_url']); assert r['title_az'] and r['published_at'] and 'sia.az' in r['source_url']"
  EXPECT: ROWVISIBLE
  EVIDENCE: automatic-evidence=v1; definition-sha256=65584e8498133ea5e5830608046f2df8a76c9fadf29837c6f0da54f45f3af070; exit=0; EXPECT=matched; output-sha256=c0fa2f8206420818600c21fe5b0a356c484dccbb4dd46f563a83ee341982fea4; output-bytes=116; shell=/bin/sh; cwd=/Users/ricci/ipek-yolu-irs; path=3c24cdda195d/20 entries
