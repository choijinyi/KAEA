# 📖 설교준비 도우미

개혁주의·복음주의 관점에서 **성경 본문 연구 → 해석 검증 → 설교 아웃라인 → 원고 초안**까지
단계별(HITL 체크포인트)로 돕는 AI 설교 준비 웹앱입니다. 루트 경로(`/`)에 배포됩니다.

## 주요 기능

- **3가지 입력 모드** — 주제(Theme) · 본문(Passage) · 시리즈(Series)로 설교 준비 시작
- **11개 전문 연구 영역** — 원문 분석, 사본학, 구조 분석, 평행 본문, 신학, 문학 비평,
  수사학, 역사적 맥락, 핵심 단어, 성경지리, 문화 배경
- **품질 보증** — 출처·신뢰도·불확실성 표시, Hallucination Firewall, SRCS 4축 평가,
  7개 Human-in-the-Loop 체크포인트
- **개인화** — 교단/신학 전통과 기본 설교 상황을 설정하면 모든 연구에 반영
- **대화 관리** — 설교 준비별 대화 기록을 브라우저(localStorage)에 저장

## API 키 (BYOK)

첫 실행 시 **본인의 Google Gemini API 키**를 입력받습니다
([Google AI Studio](https://aistudio.google.com/apikey)에서 무료 발급).

- 키는 **사용자 브라우저의 localStorage에만 저장**되며, 브라우저에서 Gemini API를
  직접 호출합니다. 별도의 서버로 전송·수집되지 않습니다.
- 서버 함수를 거치지 않으므로 Vercel 함수 타임아웃 없이 긴 연구 응답도 스트리밍됩니다.
- 모델 선택: Gemini 2.5 Pro(기본) · Gemini 2.5 Flash · Gemini 2.5 Flash-Lite

## 실행 방법

```bash
npm install
npm run dev
```

환경 변수 없이 동작합니다. Vercel에는 저장소를 연결해 그대로 배포하면 됩니다.

## 기술 스택

- Next.js 15 (App Router) · React 19 · Tailwind CSS 4
- Google Gen AI SDK(@google/genai) — 브라우저 직접 호출, 스트리밍
- react-markdown + remark-gfm (연구 결과 렌더링)

---

> 이전에 이 저장소에 있던 **Playlist Studio**(루트)와 **이름 빙고**(`/bingo`)의 코드는
> 그대로 남아 있습니다. 빙고는 여전히 `/bingo` 경로에서 동작하며, Playlist Studio UI는
> `components/Studio.tsx`에 보존되어 있습니다.
