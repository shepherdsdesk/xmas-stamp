# 성탄 말씀 스탬프 여정

교회 안 여러 장소에서 숫자 4자리(또는 QR)로 스탬프를 받고 성탄 말씀을 묵상하는 웹앱입니다.
화면은 GitHub Pages, 기록은 Supabase에 둡니다. 설치 방법은 `설치가이드.md`를 보십시오.

- `index.html` 성도 화면 · `admin.html` 관리자 · `gift.html` 선물 확인 · `tree.html` 로비 TV
- `supabase/schema.sql` Supabase SQL Editor에서 한 번 실행
- `js/config.js` Supabase 주소와 anon 키 입력

사용한 공개 도구: jsQR (Apache 2.0), QR Code generator library by Project Nayuki (MIT).
