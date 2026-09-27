# 독자용 소설 공식 사이트 — 공책 테마 / 작가 실시간 편집판

기존 `novel_reader_site`의 데이터 구조와 섹션(작품 소개 / 등장인물 / 세계관 / 회차 / 소식)은 유지하면서 아래를 추가했습니다.

- 독자 사이트: `index.html`
- 작가 전용 편집실: `editor.html`
- 작가가 입력하는 순간 오른쪽 독자 사이트 미리보기에 즉시 반영
- `임시 저장`: 독자에게는 아직 보이지 않음
- `독자 사이트에 게시`: 공개 데이터 갱신
- `자동 게시`를 켜면 입력 후 약 1.4초 뒤 공개 사이트에도 자동 반영
- 공개 사이트는 Supabase Realtime으로 열려 있는 독자 화면까지 새로고침 없이 갱신
- 독자는 DB 수정 권한이 없고, `editor.html`은 Supabase Auth 로그인 + `admin_users` 등록 계정만 편집 가능
- 학생용 스터디 노트 / 공책 콘셉트
- Google Fonts의 `Noto Sans KR`, `Gowun Dodum` 사용 (두 폰트 모두 SIL Open Font License 계열의 무료 오픈 폰트). 폰트 파일 자체는 프로젝트에 포함하지 않고 공식 웹폰트 서비스에서 로드합니다.

---

## 1. 우선 사이트만 확인하기

압축을 푼 뒤 `index.html`을 더블클릭해도 기본 화면을 볼 수 있습니다.

다만 `editor.html`의 iframe 미리보기와 일부 브라우저 보안 정책 때문에 가능하면 간단한 로컬 서버를 권장합니다.

Windows에서는 프로젝트 폴더의 `미리보기_서버.bat`를 실행한 후 브라우저에서 아래 주소를 엽니다.

- 독자: `http://localhost:8080/index.html`
- 작가: `http://localhost:8080/editor.html`

---

## 2. 실시간 편집 기능을 쓰려면 Supabase 1회 연결

이 버전은 예전 Next.js 프로젝트보다 훨씬 단순합니다. Node.js, pnpm, Vercel 환경 변수 설정이 필요 없습니다.

### A. Supabase 프로젝트 만들기

1. https://supabase.com 에서 프로젝트를 하나 만듭니다.
2. 왼쪽 `SQL Editor → New query`로 이동합니다.
3. 이 프로젝트의 `supabase/setup.sql` 전체를 복사해 붙여 넣고 `Run`을 한 번만 누릅니다.
4. `site_public`, `site_draft`, `admin_users` 테이블이 만들어집니다.

### B. 작가 로그인 계정 만들기

1. `Authentication → Users → Add user → Create new user`
2. 작가 이메일과 비밀번호를 만듭니다.
3. 생성된 사용자의 `User UID`를 복사합니다.
4. `SQL Editor → New query`에서 아래를 실행합니다.

```sql
insert into public.admin_users(user_id)
values ('여기에-복사한-User-UID')
on conflict do nothing;
```

중요: 오류 안내가 `GRANT INSERT ... TO authenticated`를 제안하더라도 그 권한을 주지 마세요. 일반 로그인 사용자가 관리자 명단을 수정할 수 있게 만들 필요가 없습니다. 위 INSERT는 Supabase Dashboard의 SQL Editor에서 프로젝트 관리자 권한으로 실행합니다.

### C. config.js에 2개 값만 넣기

`assets/config.js`를 메모장이나 VS Code로 엽니다.

```js
window.NOVEL_CONFIG = {
  supabaseUrl: "https://xxxxxxxx.supabase.co",
  supabaseAnonKey: "여기에-anon-또는-publishable-key",
  siteId: "main"
};
```

- `supabaseUrl`: Supabase `Project Settings → API`의 Project URL
- `supabaseAnonKey`: 공개용 `anon` / publishable key
- `service_role`, secret key, DB 비밀번호는 절대 넣지 마세요.

### D. 일반 회원가입 끄기

독자 회원가입이 필요 없으므로 Supabase `Authentication` 설정에서 신규 회원가입을 꺼 두는 것을 권장합니다. 작가 계정은 Dashboard에서 직접 만듭니다.

---

## 3. 작가가 사이트 수정하는 방법

1. `editor.html` 접속
2. 작가 이메일/비밀번호로 로그인
3. 왼쪽에서 `기본 정보 / 작품 소개 / 등장인물 / 세계관 / 회차 / 소식` 선택
4. 입력란을 수정하면 오른쪽 미리보기에 즉시 반영
5. `임시 저장`은 작가 초안만 저장
6. `독자 사이트에 게시`를 누르면 독자 페이지 공개 데이터 교체
7. `자동 게시`를 켜면 수정 내용이 자동으로 공개

실수 방지를 위해 자동 게시 기본값은 OFF입니다.

---

## 4. 독자는 왜 수정할 수 없나요?

공개 페이지는 `site_public`을 SELECT만 할 수 있습니다.

- `anon`: 공개 데이터 읽기만 가능
- `authenticated`: 공개 데이터 읽기 가능
- `admin_users`에 등록된 로그인 계정: 초안 저장 / 공개 게시 가능

화면에서 버튼만 숨기는 방식이 아니라 Supabase RLS 정책으로 DB 쓰기를 막습니다.

---

## 5. 인터넷에 공개하기

이 프로젝트는 순수 HTML/CSS/JS이므로 GitHub Pages, Netlify, Cloudflare Pages, Vercel의 정적 배포 등 대부분의 무료 정적 호스팅에서 사용할 수 있습니다.

배포할 때 프로젝트 폴더 전체를 올리면 됩니다. `assets/config.js`의 anon/publishable key는 브라우저용 공개 키라 포함할 수 있지만, 권한은 RLS가 통제합니다. `service_role` 키는 절대 넣지 마세요.

배포 후에는 작가가 `https://내사이트주소/editor.html`로 접속해 로그인하고 수정할 수 있으며, 독자는 `https://내사이트주소/`를 봅니다.

---

## 6. 폰트 라이선스

- Noto Sans KR — Google Noto 프로젝트, SIL Open Font License 1.1
- Gowun Dodum — Google Fonts 배포 오픈 폰트, SIL Open Font License 1.1

이 프로젝트는 폰트 파일을 재배포하지 않고 `fonts.googleapis.com` 웹폰트 CSS를 통해 불러옵니다. 외부 폰트 연결이 막히면 시스템 한글 폰트로 자동 대체됩니다.

---

## 주요 파일

```text
index.html                 독자 사이트
editor.html                작가 로그인 + 편집실
assets/config.js           Supabase URL / 공개 키
assets/site-data.js        최초 기본 데이터
assets/data-service.js     공개/초안 저장 + 실시간 갱신
assets/app.js              독자 페이지 렌더링
assets/editor.js           편집실 기능
assets/style.css           공책 테마
assets/editor.css          편집실 디자인
supabase/setup.sql         DB / RLS / Realtime 설치
미리보기_서버.bat          Windows 로컬 미리보기 서버
```
