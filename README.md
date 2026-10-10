# 터닝포인트 (Turning Point)

주사위로 굴리는 고등학교 3년. 16칸 학교 보드를 세 바퀴(3년) 돌며 사건마다 선택하고, 쌓인 능력치·진로 레벨·운으로 졸업 후 직업이 정해지는 **1인용 브라우저 보드게임**입니다.

- 한 판 약 32턴, 15~20분
- 게임 판정은 모두 브라우저에서 정해진 규칙(주사위 + 보정)으로 계산하고, 실행 중에는 AI를 호출하지 않습니다.
- 로그인 없음. 끝난 판의 익명 요약만 통계로 모읍니다(선택 사항, 없어도 게임은 동작).

자세한 규칙과 설계는 [`docs/DESIGN.md`](docs/DESIGN.md)를 보세요. (설계 문서의 가제는 '청춘다이스'였고, 지금 이름은 '터닝포인트'입니다. 이름은 `src/lib/brand.ts` 한 곳에서 바꿀 수 있습니다.)

**화면 스타일**: 하늘·구름·보라색 산·동글동글한 덤불·풀포기 난 크림색 땅을 갈색 손그림 테두리로 그린 파스텔 그림책 풍경(`src/components/Scenery.tsx`), 주사위 마스코트 '데굴이'(`src/components/DiceBuddy.tsx`). 색 토큰은 `src/app/globals.css`의 `@theme`에 있습니다. 선택지는 리그 오브 레전드의 증강 선택처럼 카드 여러 장 중 하나를 고르는 오버레이로 나오고, 오른쪽 위 '📊 내 능력치' 버튼(S 키)으로 지금까지의 능력치·돈을 볼 수 있습니다.

**설계 문서와 달라진 규칙** (`src/engine/rules.ts` 상수): 기본 능력치 상승량은 콘텐츠 값의 0.7배(`STAT_GAIN_RATE`), 졸업 판정은 능력치 보정 없이 주사위 2개만으로(`GRADUATION_USES_BONUSES = false`, 9 이상 상위 · 6~8 중위 · 5 이하 하위). 스트레스 100(번아웃)이 되면 턴을 쉬지 않고, 그때 가장 높은 기본 능력치 −15 · 체력 −10 · 스트레스 50으로(`BURNOUT_TOP_STAT_LOSS`).

## 기술 스택

| 영역 | 사용 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router) + TypeScript |
| 상태 관리 | Zustand 5 (매 액션 후 localStorage 저장) |
| 스타일 | Tailwind CSS v4 (CSS 우선 설정, `src/app/globals.css`의 `@theme` 토큰) |
| 애니메이션 | framer-motion |
| 데이터 검증 | Zod 4 (콘텐츠 JSON, 공유 링크) |
| 테스트 | Vitest, 밸런스 시뮬레이션 스크립트(tsx) |
| 통계 DB | Supabase (Postgres, PostgREST를 `fetch`로 직접 호출) |
| 배포 | Vercel + GitHub Actions CI |
| 패키지 관리 | pnpm |

## 실행 방법

Node.js 22 이상과 pnpm이 필요합니다(`corepack enable`이면 `package.json`의 버전을 자동으로 씁니다).

```bash
pnpm install
pnpm dev                    # http://localhost:3000
```

| 명령 | 하는 일 |
| --- | --- |
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 콘텐츠 검사 후 프로덕션 빌드 |
| `pnpm test` | 엔진 단위 테스트 (Vitest) |
| `pnpm typecheck` | TypeScript 검사 |
| `pnpm validate:content` | `content/` JSON 스키마·밸런스 규칙 검사 |
| `pnpm simulate --games 1000` | 자동 플레이로 엔딩·직업 분포 확인 (`--policy`, `--trait`, `--seed` 옵션) |

## 폴더 구조

```
content/                  게임 내용 (JSON): 성향, 보드, 사건, 방학, 시험, 동아리, 루트, 버프, 아이템, 엔딩
  events/                 장소·돌발·일반 칸 사건
  drafts/                 LLM 초안 (커밋하지 않음)
src/
  app/                    페이지
    page.tsx              타이틀 (새 게임 · 이어하기 · 도감 · 통계 · 설정)
    play/                 게임 화면 (클라이언트 전용)
    result/               공유용 결과 카드 (서버 렌더링 + OG 이미지)
    collection/           엔딩 도감 (localStorage)
    stats/                부스용 익명 통계 (Supabase 집계, 30초 캐시)
    api/og/               결과 미리보기 이미지 (next/og)
  components/             공용 UI(ui.tsx)와 게임 컴포넌트
  engine/                 순수 게임 규칙 (React·브라우저 API 사용 금지)
  store/                  Zustand 스토어 (엔진 호출 + 저장)
  lib/                    저장소, 설정, 도감, 공유 링크, Supabase 전송
scripts/
  validate-content.ts     콘텐츠 검사 (CI·빌드 전)
  simulate.ts             밸런스 시뮬레이션
  prompts/event.md        사건 초안용 LLM 프롬프트
supabase/migrations/      테이블·RLS·집계 함수 SQL
tests/                    Vitest
.github/workflows/ci.yml  CI
```

## 환경 변수

`.env.example`을 `.env.local`로 복사해서 채웁니다. **모두 선택 사항**이며, 비워 두면 통계 기능만 꺼집니다.

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 주소 (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 키. 새 형식 `sb_publishable_...` 권장 (예전 anon JWT도 동작) |
| `NEXT_PUBLIC_SITE_URL` | 공유 링크·OG 이미지의 절대 주소. 비우면 Vercel 프로덕션 주소 → `http://localhost:3000` 순으로 씁니다 |

브라우저에는 공개 키만 둡니다. **service role 키는 절대 넣지 마세요.**

## Supabase 마이그레이션

`supabase/migrations/0001_init.sql`이 만드는 것:

- `public.play_results` 테이블: 끝난 판의 익명 요약 (성향, 엔딩 종류, 직업, 등급, 진로 레벨, 최종 능력치, 턴 수, 플레이 시간)
- RLS 켜짐. `anon`·`authenticated`는 **insert만** 가능(`created_at` 열은 제외해서 날짜 조작 불가), 읽기·수정·삭제 불가
- `public.get_stats(since)`: 플레이 수·성향별·직업별 **집계만** 돌려주는 함수(최대 31일 전까지). 개별 행은 노출하지 않습니다

적용 방법 (둘 중 하나):

```bash
# Supabase CLI
supabase link --project-ref <project-ref>
supabase db push
```

또는 Supabase 대시보드의 SQL Editor에 파일 내용을 붙여 넣어 실행합니다. SQL은 여러 번 실행해도 안전하게 작성되어 있습니다.

확인:

```sql
select public.get_stats();                              -- 최근 24시간
select public.get_stats(now() - interval '7 days');     -- 최근 7일
```

## Vercel 배포

1. GitHub 저장소를 Vercel에서 **Import** 합니다. 프레임워크는 Next.js로 자동 인식되고, pnpm도 `packageManager` 필드로 자동 선택됩니다.
2. **Settings → Environment Variables**에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`(선택: `NEXT_PUBLIC_SITE_URL`)를 넣습니다. `NEXT_PUBLIC_` 값은 빌드 때 들어가므로, 바꾼 뒤에는 다시 배포해야 합니다.
3. `main`에 푸시하면 프로덕션, PR마다 미리보기 주소가 만들어집니다. 빌드 명령(`pnpm build`)이 콘텐츠 검사를 먼저 돌리므로, 잘못된 콘텐츠는 배포되지 않습니다.

## 콘텐츠 작성 흐름

사건 문장·선택지·수치는 모두 `content/`의 JSON이고, 엔진은 정해진 키(`stats`, `stress`, `money`, `career`, `records`, `buff`, `debuff`, `flag`)만 읽으므로 사건을 늘려도 코드는 바뀌지 않습니다.

1. `scripts/prompts/event.md` 프롬프트 템플릿(장소 정체성, 학년 분위기, 허용 분야, 검사 규칙, JSON 예시)으로 LLM에게 **장소 × 학년** 단위 초안을 받습니다.
2. 초안을 `content/drafts/`에 저장합니다(이 폴더의 JSON은 커밋되지 않습니다).
3. `pnpm validate:content`로 검사하고, 실패 메시지를 그대로 LLM에 돌려 고칩니다.
4. 사람이 읽고 말투·사실관계를 다듬은 뒤 `content/events/`로 옮겨 PR을 엽니다.
5. CI가 콘텐츠 검사, 타입 검사, 테스트, 시뮬레이션(300판)을 돌리고, 통과해야 병합합니다.

주요 검사 규칙: 장소 사건은 성장·휴식·모험 선택지 각 1개(+해금 1개까지), 능력치·스트레스 변화 ±20 이내, 돈 변화 3만 원 이내, 성장형은 진로 +3과 스트레스 증가, 모험형은 성공 +5·실패 +1, 문장 길이(상황 80자, 선택지 20자, 결과 60자), 금지어 미포함. 전체 목록은 `docs/DESIGN.md` §7을 보세요.
