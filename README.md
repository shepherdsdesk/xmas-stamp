# 성탄 말씀 스탬프 여정

교회 안 여러 장소에서 숫자 4자리(또는 QR)로 스탬프를 받고 성탄 말씀을 묵상하는 웹앱입니다.
화면은 GitHub Pages, 기록은 Supabase에 둡니다. 설치 방법은 `설치가이드.md`를 보십시오.

## 주소

GitHub 계정 `shepherdsdesk`, 저장소 이름 `xmas-stamp` 기준입니다.

| 화면 | 주소 | 누가 쓰나 |
|---|---|---|
| 성도 시작 | https://shepherdsdesk.github.io/xmas-stamp/ | 성도 (팜플렛·시작 안내판 QR) |
| 관리자 | https://shepherdsdesk.github.io/xmas-stamp/admin.html | 담당 교역자 |
| 선물 확인 | https://shepherdsdesk.github.io/xmas-stamp/gift.html | 봉사자 (12월 19일) |
| 로비 TV | https://shepherdsdesk.github.io/xmas-stamp/tree.html | 로비 TV (전체 화면) |

장소 안내판 QR은 관리자 페이지 **안내판 인쇄**에서 자동으로 만들어집니다.
형식: `https://shepherdsdesk.github.io/xmas-stamp/?s=장소번호.열쇠`

### 관리용 주소

| 하는 일 | 주소 |
|---|---|
| GitHub 저장소 (파일 올리기·고치기) | https://github.com/shepherdsdesk/xmas-stamp |
| GitHub Pages 켜기 | https://github.com/shepherdsdesk/xmas-stamp/settings/pages |
| `js/config.js` 고치기 | https://github.com/shepherdsdesk/xmas-stamp/edit/main/js/config.js |
| Supabase 프로젝트 목록 (멈췄을 때 Restore) | https://supabase.com/dashboard/projects |
| Supabase 사용량 확인 (전송량 5GB) | https://supabase.com/dashboard/org/_/usage |

## 파일

- `index.html` 성도 화면 · `admin.html` 관리자 · `gift.html` 선물 확인 · `tree.html` 로비 TV
- `supabase/schema.sql` Supabase SQL Editor에서 한 번 실행 (셔틀버스와 **다른 프로젝트**에서 실행)
- `js/config.js` Supabase 주소와 anon 키 입력

사용한 공개 도구: jsQR (Apache 2.0), QR Code generator library by Project Nayuki (MIT).
