/**
 * 영어 단어 시험지 생성기 - Main Application
 */

// ========================================
// LocalStorage Keys
// ========================================
const STORAGE_KEYS = {
    WORDS: 'vocab_words',
    THEME: 'vocab_theme',
    SETTINGS: 'vocab_settings'
};

// ========================================
// Data Structure Definitions
// ========================================

/**
 * 단어 객체 구조
 * @typedef {Object} Word
 * @property {string} id - 고유 식별자 (타임스탬프 기반)
 * @property {string} english - 영어 단어
 * @property {string} korean - 한국어 뜻
 * @property {boolean} mastered - 암기 완료 여부
 * @property {string} dateAdded - 추가 날짜 (ISO 8601 형식)
 */

/**
 * 시험지 설정 구조
 * @typedef {Object} TestSettings
 * @property {number} questionCount - 문제 수
 * @property {string} testType - 시험 유형 (eng-to-kor, kor-to-eng, mixed)
 * @property {boolean} shuffle - 단어 섞기 여부
 */

/**
 * 필터 설정 구조
 * @typedef {Object} FilterSettings
 * @property {string} category - 카테고리 필터
 * @property {string|null} dateFrom - 시작 날짜
 * @property {string|null} dateTo - 종료 날짜
 */

// ========================================
// Category Labels (한글 표시용)
// ========================================
const CATEGORY_LABELS = {
    general: '일반',
    toeic: 'TOEIC',
    toefl: 'TOEFL',
    business: '비즈니스',
    academic: '학술',
    daily: '일상'
};

// ========================================
// Application State
// ========================================
const state = {
    words: [],
    filteredWords: [],
    currentFilter: {
        category: 'all',  // 'all', 'mastered', 'learning'
        date: 'all'       // 'all' 또는 'YYYY-MM-DD' 형식
    },
    generatedTest: null
};

// 카테고리 라벨 (한글)
const CATEGORY_FILTER_LABELS = {
    all: '전체 단어',
    mastered: '완벽하게 외운 단어',
    learning: '헷갈리는 단어'
};

// ========================================
// Utility Functions
// ========================================

/**
 * 고유 ID 생성 (타임스탬프 기반)
 * @returns {string} 고유 ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 배열 섞기 (Fisher-Yates shuffle)
 * @param {Array} array - 섞을 배열
 * @returns {Array} 섞인 배열 (새 배열)
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * 날짜 포맷팅
 * @param {string} isoString - ISO 8601 날짜 문자열
 * @returns {string} 포맷된 날짜 (YYYY-MM-DD)
 */
function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString('ko-KR');
}

/**
 * 파일명용 타임스탬프 생성
 * @returns {string} YYYYMMDD_HHMMSS 형식의 문자열
 */
function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// ========================================
// Toast Notification Functions
// ========================================

/**
 * 토스트 알림 표시
 * @param {string} message - 알림 메시지
 * @param {string} type - 알림 타입 ('success' | 'error' | 'warning' | 'info')
 * @param {number} duration - 표시 시간 (ms), 기본 3000ms
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // 아이콘 설정
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    // 토스트 요소 생성
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <span class="toast__icon">${icons[type] || icons.info}</span>
        <span class="toast__message">${message}</span>
    `;

    container.appendChild(toast);

    // 지정된 시간 후 제거
    setTimeout(() => {
        toast.remove();
    }, duration);
}

// ========================================
// Loading Overlay Functions
// ========================================

/**
 * 로딩 오버레이 표시
 * @param {string} text - 로딩 메시지 (선택)
 */
function showLoading(text = 'PDF 생성 중...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = overlay?.querySelector('.loading-text');

    if (overlay) {
        if (loadingText) loadingText.textContent = text;
        overlay.hidden = false;
    }
}

/**
 * 로딩 오버레이 숨기기
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.hidden = true;
    }
}

// ========================================
// Input Validation Functions
// ========================================

/**
 * 입력값 검증
 * @param {string} english - 영어 단어
 * @param {string} korean - 한국어 뜻
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateInput(english, korean) {
    const errors = [];

    if (!english || english.trim() === '') {
        errors.push('영어 단어를 입력해주세요.');
    } else if (english.length > 100) {
        errors.push('영어 단어는 100자 이내로 입력해주세요.');
    }

    if (!korean || korean.trim() === '') {
        errors.push('한국어 뜻을 입력해주세요.');
    } else if (korean.length > 200) {
        errors.push('한국어 뜻은 200자 이내로 입력해주세요.');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// ========================================
// LocalStorage Functions
// ========================================

/**
 * LocalStorage에서 단어 목록 로드
 * @returns {Word[]} 단어 배열
 */
function loadWords() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.WORDS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('단어 로드 실패:', error);
        return [];
    }
}

/**
 * LocalStorage에 단어 목록 저장
 * @param {Word[]} words - 저장할 단어 배열
 */
function saveWords(words) {
    try {
        localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(words));
        return true;
    } catch (error) {
        // localStorage 용량 초과 처리
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            showToast('저장 공간이 부족합니다. 일부 단어를 삭제해주세요.', 'error');
        } else {
            showToast('단어 저장에 실패했습니다.', 'error');
        }
        return false;
    }
}

/**
 * 테마 로드
 * @returns {string} 테마 ('light' | 'dark')
 */
function loadTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) {
        return savedTheme;
    }
    // 시스템 테마 감지
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 테마 저장
 * @param {string} theme - 저장할 테마
 */
function saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

// ========================================
// Theme Functions
// ========================================

/**
 * 테마 적용
 * @param {string} theme - 적용할 테마 ('light' | 'dark')
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
}

/**
 * 테마 토글
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

// ========================================
// Dictionary & Translation API
// ========================================
const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const TRANSLATE_API_URL = 'https://api.mymemory.translated.net/get';

/**
 * 영어 단어를 한국어로 번역
 * @param {string} word - 번역할 영어 단어
 * @returns {Promise<string|null>} 한국어 번역 또는 null
 */
async function translateToKorean(word) {
    try {
        const url = `${TRANSLATE_API_URL}?q=${encodeURIComponent(word)}&langpair=en|ko`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('번역 API 오류');
        }

        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            const translated = data.responseData.translatedText;
            // 번역 결과가 원본과 같으면 실패로 처리
            if (translated.toLowerCase() === word.toLowerCase()) {
                return null;
            }
            return translated;
        }

        return null;
    } catch (error) {
        console.error('번역 오류:', error);
        throw error;
    }
}

/**
 * 사전 API에서 단어 정의를 가져와서 한국어로 번역
 * @param {string} word - 검색할 영어 단어
 * @returns {Promise<Object>} { korean: 한글뜻, partOfSpeech: 품사 }
 */
async function lookupWord(word) {
    try {
        // 1. 먼저 단어 자체를 한국어로 번역 시도
        const directTranslation = await translateToKorean(word);

        // 2. 사전 API에서 품사 정보 가져오기
        let partOfSpeech = '';
        try {
            const dictResponse = await fetch(`${DICTIONARY_API_URL}${encodeURIComponent(word.toLowerCase())}`);
            if (dictResponse.ok) {
                const dictData = await dictResponse.json();
                if (dictData?.[0]?.meanings?.[0]?.partOfSpeech) {
                    partOfSpeech = getPartOfSpeechKorean(dictData[0].meanings[0].partOfSpeech);
                }
            }
        } catch (e) {
            // 사전 API 실패해도 번역은 사용
        }

        if (directTranslation) {
            const result = partOfSpeech ? `(${partOfSpeech}) ${directTranslation}` : directTranslation;
            return result;
        }

        return null;
    } catch (error) {
        console.error('사전 검색 오류:', error);
        throw error;
    }
}

/**
 * 품사를 한글로 변환
 * @param {string} pos - 영어 품사
 * @returns {string} 한글 품사
 */
function getPartOfSpeechKorean(pos) {
    const posMap = {
        'noun': '명',
        'verb': '동',
        'adjective': '형',
        'adverb': '부',
        'pronoun': '대',
        'preposition': '전',
        'conjunction': '접',
        'interjection': '감',
        'determiner': '한정',
        'exclamation': '감'
    };
    return posMap[pos.toLowerCase()] || pos;
}

// ========================================
// DOM Element References
// ========================================
const elements = {
    // Forms
    wordForm: null,
    wordEnglish: null,
    wordKorean: null,
    wordCategory: null,
    lookupBtn: null,

    // Filters
    filterTabs: null,
    filterDate: null,
    resetFilterBtn: null,
    filterStatus: null,
    filterStatusText: null,
    filterStatusCount: null,

    // Word List
    wordList: null,
    wordCount: null,

    // Test Generation
    generateTestBtn: null,
    downloadPdfBtn: null,

    // Preview
    testPreview: null,

    // Theme
    themeToggle: null
};

/**
 * DOM 요소 참조 초기화
 */
function initElements() {
    elements.wordForm = document.getElementById('word-form');
    elements.wordEnglish = document.getElementById('word-english');
    elements.wordKorean = document.getElementById('word-korean');
    elements.wordCategory = document.getElementById('word-category');
    elements.lookupBtn = document.getElementById('lookup-btn');

    elements.filterTabs = document.querySelectorAll('.filter-tab');
    elements.filterDate = document.getElementById('filter-date');
    elements.resetFilterBtn = document.getElementById('reset-filter');
    elements.filterStatus = document.getElementById('filter-status');
    elements.filterStatusText = document.querySelector('.filter-status__text');
    elements.filterStatusCount = document.querySelector('.filter-status__count');

    elements.wordList = document.getElementById('word-list');
    elements.wordCount = document.getElementById('word-count');

    elements.generateTestBtn = document.getElementById('generate-test');
    elements.downloadPdfBtn = document.getElementById('download-pdf');

    elements.testPreview = document.getElementById('test-preview');

    elements.themeToggle = document.getElementById('theme-toggle');
}

// ========================================
// Event Handlers (Placeholder)
// ========================================

/**
 * 이벤트 리스너 등록
 */
function initEventListeners() {
    // 테마 토글
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }

    // 단어 추가 폼
    if (elements.wordForm) {
        elements.wordForm.addEventListener('submit', handleWordSubmit);
    }

    // 사전 검색 버튼
    if (elements.lookupBtn) {
        elements.lookupBtn.addEventListener('click', handleLookupWord);
    }

    // 카테고리 필터 탭
    elements.filterTabs.forEach(tab => {
        tab.addEventListener('click', () => handleCategoryFilter(tab));
    });

    // 날짜 필터
    if (elements.filterDate) {
        elements.filterDate.addEventListener('change', handleDateFilter);
    }

    // 필터 초기화
    if (elements.resetFilterBtn) {
        elements.resetFilterBtn.addEventListener('click', handleResetFilter);
    }

    // 시험지 생성
    if (elements.generateTestBtn) {
        elements.generateTestBtn.addEventListener('click', handleGenerateTest);
    }
    if (elements.downloadPdfBtn) {
        elements.downloadPdfBtn.addEventListener('click', handleDownloadPdf);
    }
}

/**
 * 단어 추가 핸들러
 * @param {Event} e - Submit 이벤트
 */
function handleWordSubmit(e) {
    e.preventDefault();

    const english = elements.wordEnglish.value.trim();
    const korean = elements.wordKorean.value.trim();

    // 입력값 검증
    const validation = validateInput(english, korean);
    if (!validation.valid) {
        validation.errors.forEach(error => {
            if (error.includes('영어')) {
                showError(elements.wordEnglish, error);
            } else {
                showError(elements.wordKorean, error);
            }
        });
        return;
    }

    // 새 단어 객체 생성
    const newWord = {
        id: generateId(),
        english: english,
        korean: korean,
        mastered: false,
        dateAdded: new Date().toISOString()
    };

    // state에 추가
    state.words.push(newWord);

    // localStorage에 저장
    const saved = saveWords(state.words);
    if (!saved) {
        // 저장 실패 시 state에서 제거
        state.words.pop();
        return;
    }

    // 입력 필드 초기화
    elements.wordEnglish.value = '';
    elements.wordKorean.value = '';
    elements.wordEnglish.focus();

    // 날짜 드롭다운 업데이트 및 필터 적용
    updateDateFilterOptions();
    applyFilters();

    // 성공 토스트
    showToast(`"${english}" 단어가 추가되었습니다.`, 'success');
}

/**
 * 사전 검색 핸들러
 */
async function handleLookupWord() {
    const english = elements.wordEnglish.value.trim();

    if (!english) {
        showToast('검색할 영어 단어를 입력해주세요.', 'warning');
        elements.wordEnglish.focus();
        return;
    }

    // 버튼 비활성화 및 로딩 상태
    const originalText = elements.lookupBtn.innerHTML;
    elements.lookupBtn.disabled = true;
    elements.lookupBtn.innerHTML = '검색 중...';

    try {
        const definition = await lookupWord(english);

        if (definition) {
            elements.wordKorean.value = definition;
            elements.wordKorean.focus();
            showToast(`"${english}"의 뜻을 찾았습니다.`, 'success');
        } else {
            showToast(`"${english}" 단어를 사전에서 찾을 수 없습니다. 직접 입력해주세요.`, 'warning');
            elements.wordKorean.focus();
        }
    } catch (error) {
        showToast('사전 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
        // 버튼 원래 상태로 복원
        elements.lookupBtn.disabled = false;
        elements.lookupBtn.innerHTML = originalText;
    }
}

/**
 * 에러 메시지 표시
 * @param {HTMLElement} inputElement - 입력 필드 요소
 * @param {string} message - 에러 메시지
 */
function showError(inputElement, message) {
    // 기존 에러 제거
    clearError(inputElement);

    // 에러 메시지 요소 생성
    const errorEl = document.createElement('span');
    errorEl.className = 'form-error';
    errorEl.textContent = message;

    // 입력 필드 아래에 에러 표시
    inputElement.classList.add('form-input--error');
    inputElement.parentNode.appendChild(errorEl);

    // 3초 후 에러 자동 제거
    setTimeout(() => clearError(inputElement), 3000);
}

/**
 * 에러 메시지 제거
 * @param {HTMLElement} inputElement - 입력 필드 요소
 */
function clearError(inputElement) {
    inputElement.classList.remove('form-input--error');
    const errorEl = inputElement.parentNode.querySelector('.form-error');
    if (errorEl) {
        errorEl.remove();
    }
}

/**
 * 카테고리 필터 핸들러
 * @param {HTMLElement} selectedTab - 선택된 탭 요소
 */
function handleCategoryFilter(selectedTab) {
    const category = selectedTab.dataset.category;

    // 현재 필터 상태 업데이트
    state.currentFilter.category = category;

    // 탭 활성화 상태 업데이트
    elements.filterTabs.forEach(tab => {
        tab.classList.remove('filter-tab--active');
        tab.setAttribute('aria-selected', 'false');
    });
    selectedTab.classList.add('filter-tab--active');
    selectedTab.setAttribute('aria-selected', 'true');

    // 필터 적용 및 렌더링
    applyFilters();
}

/**
 * 날짜 필터 핸들러
 */
function handleDateFilter() {
    state.currentFilter.date = elements.filterDate.value;
    applyFilters();
}

/**
 * 필터 초기화 핸들러
 */
function handleResetFilter() {
    // 필터 상태 초기화
    state.currentFilter.category = 'all';
    state.currentFilter.date = 'all';

    // UI 초기화 - 카테고리 탭
    elements.filterTabs.forEach(tab => {
        tab.classList.remove('filter-tab--active');
        tab.setAttribute('aria-selected', 'false');
        if (tab.dataset.category === 'all') {
            tab.classList.add('filter-tab--active');
            tab.setAttribute('aria-selected', 'true');
        }
    });

    // UI 초기화 - 날짜 선택
    if (elements.filterDate) {
        elements.filterDate.value = 'all';
    }

    // 필터 적용
    applyFilters();
}

/**
 * 필터 적용 및 목록 업데이트
 */
function applyFilters() {
    state.filteredWords = getFilteredWords();
    renderWordList();
    updateFilterStatus();
}

/**
 * 필터링된 단어 배열 반환
 * @returns {Word[]} 필터링된 단어 배열
 */
function getFilteredWords() {
    let filtered = [...state.words];

    // 카테고리 필터 적용
    if (state.currentFilter.category === 'mastered') {
        filtered = filtered.filter(word => word.mastered === true);
    } else if (state.currentFilter.category === 'learning') {
        filtered = filtered.filter(word => word.mastered === false);
    }

    // 날짜 필터 적용
    if (state.currentFilter.date !== 'all') {
        filtered = filtered.filter(word => {
            const wordDate = new Date(word.dateAdded).toISOString().split('T')[0];
            return wordDate === state.currentFilter.date;
        });
    }

    return filtered;
}

/**
 * 필터 상태 표시 업데이트
 */
function updateFilterStatus() {
    if (!elements.filterStatusText || !elements.filterStatusCount) return;

    // 카테고리 라벨
    let statusText = CATEGORY_FILTER_LABELS[state.currentFilter.category];

    // 날짜가 선택된 경우 추가
    if (state.currentFilter.date !== 'all') {
        statusText += ` (${formatDateKorean(state.currentFilter.date)})`;
    }

    elements.filterStatusText.textContent = statusText;
    elements.filterStatusCount.textContent = `${state.filteredWords.length}개`;
}

/**
 * 날짜 드롭다운 옵션 업데이트
 */
function updateDateFilterOptions() {
    if (!elements.filterDate) return;

    // 기존 옵션 제거 (첫 번째 '전체 날짜' 제외)
    while (elements.filterDate.options.length > 1) {
        elements.filterDate.remove(1);
    }

    // 단어들의 날짜 추출 (중복 제거, 정렬)
    const dates = [...new Set(
        state.words.map(word => new Date(word.dateAdded).toISOString().split('T')[0])
    )].sort().reverse(); // 최신 날짜가 먼저

    // 옵션 추가
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDateKorean(date);
        elements.filterDate.appendChild(option);
    });

    // 현재 선택된 날짜 유지
    if (dates.includes(state.currentFilter.date)) {
        elements.filterDate.value = state.currentFilter.date;
    } else {
        state.currentFilter.date = 'all';
        elements.filterDate.value = 'all';
    }
}

/**
 * 날짜를 한글 형식으로 변환
 * @param {string} dateStr - YYYY-MM-DD 형식의 날짜 문자열
 * @returns {string} YYYY년 MM월 DD일 형식
 */
function formatDateKorean(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

/**
 * 시험지 생성 핸들러
 */
function handleGenerateTest() {
    // 필터된 단어가 없으면 알림
    if (state.filteredWords.length === 0) {
        showToast('시험지를 생성할 단어가 없습니다. 단어를 추가하거나 필터를 변경해주세요.', 'warning');
        return;
    }

    // 시험지 생성
    const testSheet = generateTestSheet(state.filteredWords);

    // 시험지 표시
    displayTestSheet(testSheet);

    // state에 저장
    state.generatedTest = testSheet;

    // PDF 다운로드 버튼 활성화
    if (elements.downloadPdfBtn) {
        elements.downloadPdfBtn.disabled = false;
    }

    // 성공 토스트
    showToast(`${testSheet.totalCount}문제 시험지가 생성되었습니다.`, 'success');
}

/**
 * 시험지 HTML 생성
 * @param {Word[]} words - 단어 배열
 * @returns {Object} 시험지 데이터 객체
 */
function generateTestSheet(words) {
    // 원본 배열을 변경하지 않고 섞기
    const shuffledWords = shuffleArray(words);

    // 시험지 데이터 생성
    const testSheet = {
        title: '영어 단어 시험',
        date: new Date().toLocaleDateString('ko-KR'),
        totalCount: shuffledWords.length,
        words: shuffledWords.map((word, index) => ({
            number: index + 1,
            english: word.english,
            korean: word.korean // 정답용으로 저장
        }))
    };

    return testSheet;
}

/**
 * 시험지 화면에 표시
 * @param {Object} testSheet - 시험지 데이터 객체
 */
function displayTestSheet(testSheet) {
    if (!elements.testPreview) return;

    // 시험지 HTML 생성
    const html = `
        <div class="test-sheet">
            <div class="test-sheet__header">
                <h3 class="test-sheet__title">${testSheet.title}</h3>
                <div class="test-sheet__info">
                    <span>날짜: ${testSheet.date}</span>
                    <span>총 ${testSheet.totalCount}문제</span>
                </div>
                <div class="test-sheet__name-field">
                    <span>이름:</span>
                    <span class="test-sheet__name-line"></span>
                </div>
            </div>
            <div class="test-sheet__body">
                <table class="test-sheet__table">
                    <thead>
                        <tr>
                            <th class="test-sheet__col-number">번호</th>
                            <th class="test-sheet__col-english">영어 단어</th>
                            <th class="test-sheet__col-answer">뜻 (한국어)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${testSheet.words.map(item => `
                            <tr class="test-sheet__row">
                                <td class="test-sheet__number">${item.number}</td>
                                <td class="test-sheet__english">${escapeHtml(item.english)}</td>
                                <td class="test-sheet__answer"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="test-sheet__actions no-print">
                <button class="btn btn--primary" onclick="window.print()">인쇄하기</button>
                <button class="btn btn--outline" onclick="hideTestSheet()">닫기</button>
            </div>
        </div>
    `;

    elements.testPreview.innerHTML = html;
    elements.testPreview.classList.add('test-preview--visible');

    // 시험지 섹션으로 스크롤
    elements.testPreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 시험지 숨기기
 */
function hideTestSheet() {
    if (!elements.testPreview) return;

    elements.testPreview.innerHTML = '<p class="empty-message">시험지를 생성해주세요.</p>';
    elements.testPreview.classList.remove('test-preview--visible');

    // PDF 버튼 비활성화
    if (elements.downloadPdfBtn) {
        elements.downloadPdfBtn.disabled = true;
    }

    state.generatedTest = null;
}

/**
 * PDF 다운로드 핸들러 (jsPDF + autoTable 사용)
 */
async function handleDownloadPdf() {
    if (!state.generatedTest) {
        showToast('먼저 시험지를 생성해주세요.', 'warning');
        return;
    }

    // 로딩 표시
    showLoading('PDF 생성 중...');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const testSheet = state.generatedTest;
        const pageWidth = doc.internal.pageSize.getWidth();

        // 제목 (영어로 표시)
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('English Vocabulary Test', pageWidth / 2, 20, { align: 'center' });

        // 날짜 및 문제 수
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${testSheet.date}    Total: ${testSheet.totalCount} words`, pageWidth / 2, 28, { align: 'center' });

        // 이름 필드
        doc.setFontSize(12);
        doc.text('Name:', pageWidth - 60, 38);
        doc.line(pageWidth - 45, 38, pageWidth - 15, 38);

        // 테이블 데이터 준비
        const tableData = testSheet.words.map(item => [
            item.number.toString(),
            item.english,
            '' // 빈 답안 칸
        ]);

        // autoTable로 테이블 생성
        doc.autoTable({
            startY: 45,
            head: [['No.', 'English', 'Korean Meaning']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [245, 245, 245],
                textColor: [51, 51, 51],
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 60 },
                2: { cellWidth: 'auto' }
            },
            styles: {
                fontSize: 11,
                cellPadding: 4,
                lineColor: [200, 200, 200],
                lineWidth: 0.3
            },
            alternateRowStyles: {
                fillColor: [250, 250, 250]
            },
            margin: { left: 15, right: 15 }
        });

        // PDF 다운로드
        doc.save(`VocabularyTest_${getTimestamp()}.pdf`);

        // 성공 알림
        showToast('PDF가 성공적으로 다운로드되었습니다.', 'success');
    } catch (error) {
        console.error('PDF 생성 오류:', error);
        showToast('PDF 생성에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
        // 로딩 숨기기
        hideLoading();
    }
}

// ========================================
// Render Functions (Placeholder)
// ========================================

/**
 * 단어 목록 렌더링
 */
function renderWordList() {
    if (!elements.wordList) return;

    // 목록 비우기
    elements.wordList.innerHTML = '';

    // 단어가 없으면 빈 메시지 표시
    if (state.filteredWords.length === 0) {
        elements.wordList.innerHTML = '<p class="empty-message">등록된 단어가 없습니다.</p>';
        updateWordCount();
        return;
    }

    // 각 단어 아이템 생성
    state.filteredWords.forEach(word => {
        const wordItem = createWordItem(word);
        elements.wordList.appendChild(wordItem);
    });

    updateWordCount();
}

/**
 * 단어 아이템 요소 생성
 * @param {Word} word - 단어 객체
 * @returns {HTMLElement} 단어 아이템 요소
 */
function createWordItem(word) {
    const item = document.createElement('div');
    item.className = `word-item ${word.mastered ? 'word-item--mastered' : ''}`;
    item.dataset.id = word.id;

    item.innerHTML = `
        <div class="word-item__checkbox">
            <input type="checkbox"
                   id="mastered-${word.id}"
                   class="mastered-checkbox"
                   ${word.mastered ? 'checked' : ''}
                   title="암기 완료">
        </div>
        <div class="word-item__content">
            <span class="word-item__english">${escapeHtml(word.english)}</span>
            <span class="word-item__korean">${escapeHtml(word.korean)}</span>
            <span class="word-item__date">${formatDate(word.dateAdded)}</span>
        </div>
        <div class="word-item__actions">
            <button class="btn btn--small btn--outline edit-btn" data-id="${word.id}">수정</button>
            <button class="btn btn--small btn--danger delete-btn" data-id="${word.id}">삭제</button>
        </div>
    `;

    // 이벤트 리스너 등록
    const masteredCheckbox = item.querySelector('.mastered-checkbox');
    const editBtn = item.querySelector('.edit-btn');
    const deleteBtn = item.querySelector('.delete-btn');

    masteredCheckbox.addEventListener('change', () => handleMasteredToggle(word.id));
    editBtn.addEventListener('click', () => handleEditWord(word.id));
    deleteBtn.addEventListener('click', () => handleDeleteWord(word.id));

    return item;
}

/**
 * HTML 이스케이프 (XSS 방지)
 * @param {string} str - 이스케이프할 문자열
 * @returns {string} 이스케이프된 문자열
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * 암기 완료 토글 핸들러
 * @param {string} wordId - 단어 ID
 */
function handleMasteredToggle(wordId) {
    const wordIndex = state.words.findIndex(w => w.id === wordId);
    if (wordIndex === -1) return;

    // mastered 상태 토글
    state.words[wordIndex].mastered = !state.words[wordIndex].mastered;

    // localStorage 즉시 업데이트
    saveWords(state.words);

    // 필터 다시 적용
    applyFilters();
}

/**
 * 단어 수정 핸들러
 * @param {string} wordId - 단어 ID
 */
function handleEditWord(wordId) {
    const word = state.words.find(w => w.id === wordId);
    if (!word) return;

    const wordItem = document.querySelector(`.word-item[data-id="${wordId}"]`);
    if (!wordItem) return;

    // 이미 수정 모드인지 확인
    if (wordItem.classList.contains('word-item--editing')) return;

    // 수정 모드로 변경
    wordItem.classList.add('word-item--editing');

    const contentDiv = wordItem.querySelector('.word-item__content');
    const actionsDiv = wordItem.querySelector('.word-item__actions');

    // 원본 내용 저장
    const originalContent = contentDiv.innerHTML;
    const originalActions = actionsDiv.innerHTML;

    // 수정 폼으로 변경
    contentDiv.innerHTML = `
        <input type="text" class="form-input edit-english" value="${escapeHtml(word.english)}" placeholder="영어 단어">
        <input type="text" class="form-input edit-korean" value="${escapeHtml(word.korean)}" placeholder="한국어 뜻">
    `;

    actionsDiv.innerHTML = `
        <button class="btn btn--small btn--primary save-btn">저장</button>
        <button class="btn btn--small btn--outline cancel-btn">취소</button>
    `;

    // 수정 완료/취소 이벤트
    const saveBtn = actionsDiv.querySelector('.save-btn');
    const cancelBtn = actionsDiv.querySelector('.cancel-btn');
    const englishInput = contentDiv.querySelector('.edit-english');
    const koreanInput = contentDiv.querySelector('.edit-korean');

    // 영어 입력 필드에 포커스
    englishInput.focus();

    saveBtn.addEventListener('click', () => {
        const newEnglish = englishInput.value.trim();
        const newKorean = koreanInput.value.trim();

        if (!newEnglish || !newKorean) {
            alert('영어 단어와 한국어 뜻을 모두 입력해주세요.');
            return;
        }

        // 단어 업데이트
        const wordIndex = state.words.findIndex(w => w.id === wordId);
        if (wordIndex !== -1) {
            state.words[wordIndex].english = newEnglish;
            state.words[wordIndex].korean = newKorean;
            saveWords(state.words);
            state.filteredWords = [...state.words];
            renderWordList();
        }
    });

    cancelBtn.addEventListener('click', () => {
        contentDiv.innerHTML = originalContent;
        actionsDiv.innerHTML = originalActions;
        wordItem.classList.remove('word-item--editing');

        // 이벤트 다시 등록
        const editBtn = actionsDiv.querySelector('.edit-btn');
        const deleteBtn = actionsDiv.querySelector('.delete-btn');
        editBtn.addEventListener('click', () => handleEditWord(wordId));
        deleteBtn.addEventListener('click', () => handleDeleteWord(wordId));
    });

    // Enter 키로 저장
    englishInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') koreanInput.focus();
    });
    koreanInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveBtn.click();
    });
}

/**
 * 단어 삭제 핸들러
 * @param {string} wordId - 단어 ID
 */
function handleDeleteWord(wordId) {
    const word = state.words.find(w => w.id === wordId);
    if (!word) return;

    // 확인 다이얼로그
    const confirmed = confirm(`"${word.english}" 단어를 삭제하시겠습니까?`);
    if (!confirmed) return;

    const deletedWord = word.english;

    // state에서 제거
    state.words = state.words.filter(w => w.id !== wordId);

    // localStorage 업데이트
    saveWords(state.words);

    // 날짜 드롭다운 업데이트 및 필터 적용
    updateDateFilterOptions();
    applyFilters();

    // 성공 토스트
    showToast(`"${deletedWord}" 단어가 삭제되었습니다.`, 'success');
}

/**
 * 단어 개수 업데이트
 */
function updateWordCount() {
    if (elements.wordCount) {
        elements.wordCount.textContent = state.filteredWords.length;
    }
}

// ========================================
// Initialization
// ========================================

/**
 * 앱 초기화
 */
function init() {
    // DOM 요소 참조 초기화
    initElements();

    // 테마 적용
    const theme = loadTheme();
    applyTheme(theme);

    // 단어 데이터 로드
    state.words = loadWords();

    // 이벤트 리스너 등록
    initEventListeners();

    // 날짜 드롭다운 초기화
    updateDateFilterOptions();

    // 필터 적용 및 초기 렌더링
    applyFilters();
}

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', init);
