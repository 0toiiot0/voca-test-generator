# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

이 프로젝트는 빌드 도구 없이 정적 파일로 구성됩니다.

```bash
# 로컬 서버 실행 (Python)
python -m http.server 8000

# 또는 VS Code Live Server 확장 사용
```

브라우저에서 `http://localhost:8000` 접속

## Architecture

영어 단어 시험지 생성 웹 앱 (Vanilla JavaScript SPA)

### 파일 구조
- `index.html` - 메인 HTML (시맨틱 구조)
- `styles.css` - 스타일시트 (CSS 변수 기반 테마 시스템)
- `app.js` - 애플리케이션 로직

### 데이터 흐름
1. **단어 데이터**: localStorage (`vocab_words` 키)에 JSON 배열로 저장
2. **테마 설정**: localStorage (`vocab_theme` 키)에 저장, 시스템 테마 자동 감지
3. **상태 관리**: `state` 객체에서 `words`, `filteredWords`, `currentFilter`, `generatedTest` 관리

### 단어 객체 구조
```javascript
{
  id: string,        // UUID
  english: string,   // 영어 단어
  korean: string,    // 한국어 뜻
  category: string,  // general, toeic, toefl, business, academic, daily
  createdAt: string, // ISO 8601
  updatedAt: string  // ISO 8601
}
```

### 외부 라이브러리 (CDN)
- jsPDF 2.5.1 - PDF 생성
- html2pdf.js 0.10.1 - HTML to PDF 변환
