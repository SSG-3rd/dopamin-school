# 데굴데굴 스쿨 장소 사건 초안 프롬프트

> 사용법: `{{...}}` 자리를 채워 LLM에 보낸다. 장소 × 학년 단위로 한 번에 {{count}}개씩 받는다.
> 받은 JSON 배열은 `content/drafts/{{tile}}_y{{year}}.json`에 저장하고
> `pnpm validate:content content/drafts/{{tile}}_y{{year}}.json`으로 검사한다.
> 실패 메시지(`[사건 id] 내용`)는 그대로 LLM에 돌려주어 고치게 한다. 사람이 말투·사실관계를 검수한 뒤 `content/events/{{tile}}.json`으로 옮긴다.

---

너는 한국 고등학생의 일상을 그리는 보드게임 「데굴데굴 스쿨」의 사건 작가다.
플레이어는 주사위를 굴려 학교 보드를 3바퀴(1~3학년) 돌고, 장소 칸에 멈추면 사건 카드 하나를 받아 선택지 3개 중 하나를 고른다.
아래 조건으로 **{{tile_name}}({{tile}})** 칸의 **{{year}}학년** 사건 {{count}}개를 JSON 배열로만 출력해라. 설명 문장, 마크다운 코드 블록 표시는 쓰지 않는다.

## 장소의 한 줄 정체성

| tile | 장소 | 정체성 | 허용 진로(career) | 자주 쓰는 기록(records) |
| --- | --- | --- | --- | --- |
| commute | 등굣길 | 아침마다 지각과 우연한 만남이 교차하는 길 | sports, comm | late |
| classroom | 교실 | 수업·조별 과제·학급 일로 부대끼는 하루의 중심 | academic, comm, biz | praise |
| library | 도서관 | 조용히 몰입하고, 공모전과 대회를 처음 만나는 곳 | academic, arts | award (공모전은 flag "contest") |
| field | 운동장 | 2학기 체육대회와 축제로 들뜨는 무대 | sports, arts, biz | award |
| club | 동아리방 | 내 동아리 사람들과 연습하고 대회에 도전하는 곳 | 그 동아리의 분야 하나만 | award |

이번 장소: **{{tile_name}}** — 허용 진로: **{{allowed_careers}}**

## 학년 분위기

- **1학년**: 새 학기의 설렘과 어색함. 처음 해 보는 일, 새 친구, 학교 적응.
- **2학년**: 학교에 익숙해지고 동아리·학생회 활동이 본격적. 진로 고민이 시작된다.
- **3학년**: 입시와 마지막 행사가 겹친다. "마지막", "후배", "추억"의 정서. 너무 무겁지 않게.

이번 학년: **{{year}}학년**. 다른 학년에도 어울리는 사건이면 `years`에 함께 넣어도 된다 (예: `[1, 2]`).

## 말투와 금지 사항

- 반말 서술, 따뜻하고 유쾌한 고등학교 일상. 10대 이용자에게 맞는 표현만 쓴다.
- 폭력·연애·비하·선정·음주·흡연·도박 소재 금지. 금지어: 죽여, 죽어라, 자살, 살인, 폭행, 때려, 병신, 찐따, 섹시, 야동, 음주, 담배, 도박.
- 실제 인물·브랜드 이름은 쓰지 않는다.

## 형식 규칙 (검사 스크립트가 그대로 확인한다)

1. 사건 필드: `id`, `tile`, `years`, (선택) `requires`, `title`, `text`, `options`.
   - `id`는 `{{tile}}_y{{year}}_영문_요약` 형식, 전체에서 유일해야 한다.
   - `requires`는 조건이 있을 때만: `{ "routeId": "council" }`, `{ "clubId": "band" }`, `{ "minStats": { "study": 50 } }`.
2. 기본 선택지(`unlock` 없음)는 정확히 3개: `growth` 1개, `rest` 1개, `adventure` 1개. 해금 선택지(`unlock` 있음)는 최대 1개 더. 선택지 `id`는 사건 안에서 유일.
3. **growth(성장형, 무리하기)**: `check` 없음. `effects.career` 허용 분야 하나에 정확히 +3, `effects.stress` +5~+15, 기본 능력치 하나 +5~+10. `resultText.done` 한 줄.
4. **rest(관계·휴식형)**: 진로 경험치 없음. `stats.social` +5 이상 또는 `stress` −10~−20. `resultText.done` 한 줄. 부탁을 거절하는 선택지에는 `"tags": ["refuseFavor"]`를 붙인다 (등굣길·교실).
5. **adventure(모험형)**: `"check": { "by": ..., "diff": 8 }`. `by`는 study/stamina/social/luck 또는 academic/sports/arts/comm/biz (동아리 사건은 "club"). `onSuccess.career` 한 분야 +5, `onFail.career` 같은 분야 +1, `onFail.stress`는 +10. `resultText.success`와 `resultText.fail` 필수.
6. **해금 선택지**: `"unlock": { "career": "<분야>", "level": 2 }` (분야는 허용 진로 안에서) 또는 교실 사건만 `"unlock": { "buff": "teacher_trust" }`. 진로 해금은 adventure 규칙을 따르고 성공 시 `records.award` +1을 준다. 예: 예술 축제 무대, 운동 대표 선발전, 학문 경시대회, 소통 학생회 출마, 경영 축제 부스.
7. `effects`/`onSuccess`/`onFail` 키는 `stats`, `stress`, `money`, `career`, `records`(examPass/award/praise/late), `buff`, `debuff`, `flag`만. 능력치·스트레스 변화는 항목당 ±20 이하, 돈은 ±30000 이하.
8. `career`는 허용 진로({{allowed_careers}}) 밖의 분야를 쓰지 않는다. 해금 선택지도 마찬가지.
9. 버프 id는 part_timer, prestudy, recharged, practice, travel, teacher_trust, energy_drink, allnighter만. 플래그는 casting, viral, contest만.
10. 글자 수: `text` ≤ 80자, 선택지 `label` ≤ 20자, `resultText` 문장 ≤ 60자.

## 예시 (형식만 참고하고 내용은 새로 쓴다)

```json
[
  {
    "id": "classroom_y1_group_project",
    "tile": "classroom",
    "years": [1, 2],
    "title": "잠수 탄 조원",
    "text": "조별 과제 발표 날, 조원 한 명이 연락을 끊었다.",
    "options": [
      { "id": "solo", "kind": "growth", "label": "혼자 다 준비한다",
        "effects": { "stats": { "study": 10 }, "stress": 15, "career": { "academic": 3 } },
        "resultText": { "done": "밤늦게까지 슬라이드 20장을 완성했다. 내가 해냈다." } },
      { "id": "persuade", "kind": "adventure", "label": "조원을 찾아가 설득한다",
        "check": { "by": "social", "diff": 8 },
        "onSuccess": { "stats": { "social": 10 }, "career": { "comm": 5 }, "records": { "praise": 1 } },
        "onFail": { "stress": 10, "career": { "comm": 1 } },
        "resultText": { "success": "조원이 사과하며 자료를 내밀었다.", "fail": "끝내 답이 없었다." } },
      { "id": "skip", "kind": "rest", "label": "대충 얼버무린다", "tags": ["refuseFavor"],
        "effects": { "stress": -10 },
        "resultText": { "done": "발표는 짧게 끝났다. 뭐, 그럴 수도 있지." } },
      { "id": "tell_teacher", "kind": "rest", "label": "선생님께 사정을 말씀드린다",
        "unlock": { "buff": "teacher_trust" },
        "effects": { "stress": -15, "records": { "praise": 1 } },
        "resultText": { "done": "선생님이 사정을 들어 주시고, 혼자 애쓴 걸 칭찬해 주셨다." } }
    ]
  }
]
```

## 출력

- {{count}}개의 사건을 담은 JSON 배열 하나만 출력한다.
- 이미 있는 사건과 겹치지 않는 상황을 고른다. 기존 제목: {{existing_titles}}
