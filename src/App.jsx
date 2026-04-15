import { useState, useRef, useCallback } from 'react'
import { analyzeText, enrichWithDictionary } from './utils/analyzer'
import { readTextFile, fetchUrlContent, extractTextFromHtml } from './utils/reader'

// ── TTS ──
function speak(word) {
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(word)
  utter.lang = 'en-US'
  utter.rate = 0.85
  window.speechSynthesis.speak(utter)
}

// ── Icons (inline SVG) ──
function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function LoadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

// ── Word row ──
function WordRow({ item }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:py-4 group hover:bg-slate-50 px-2 sm:px-3 rounded-lg transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        <span className="text-xs font-bold text-indigo-600 w-6 shrink-0">{item.rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-base">{item.word}</span>
            <span className="text-xs text-slate-400 font-mono">{item.phonetic}</span>
            <button
              onClick={() => speak(item.word)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700 transition-colors cursor-pointer"
              title="단어 듣기"
            >
              <SpeakerIcon />
            </button>
          </div>
          <p className="text-sm text-slate-700 mt-0.5 font-medium">{item.meaningKo}</p>
          {item.meaningEn && (
            <p className="text-xs text-slate-400 mt-0.5">{item.meaningEn}</p>
          )}
        </div>
        <span className="self-start sm:self-center text-xs font-medium bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full shrink-0">
          {item.count}회
        </span>
      </div>
      {item.sentences?.length > 0 && (
        <div className="ml-6 sm:ml-10 space-y-1.5 border-l-2 border-slate-100 pl-3">
          {item.sentences.map((s, i) => (
            <div key={i} className="text-sm">
              <p className="text-slate-600 leading-relaxed">{s.en}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.ko}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── App ──
function App() {
  const [words, setWords] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [removeStopwords, setRemoveStopwords] = useState(true)
  const [ignoreCase, setIgnoreCase] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const jsonInputRef = useRef(null)
  const txtInputRef = useRef(null)

  const tabs = ["텍스트", "파일", "URL"]

  // ── 분석 실행 ──
  const handleAnalyze = useCallback(async () => {
    setLoading(true)
    setError('')
    setWords([])
    let targetText = ''

    try {
      if (activeTab === 0) {
        targetText = text
        if (!targetText.trim()) throw new Error('텍스트를 입력해주세요.')
      } else if (activeTab === 1) {
        const file = txtInputRef.current?.files?.[0]
        if (!file) throw new Error('파일을 선택해주세요.')
        targetText = await readTextFile(file)
      } else if (activeTab === 2) {
        if (!url.trim()) throw new Error('URL을 입력해주세요.')
        const html = await fetchUrlContent(url.trim())
        targetText = extractTextFromHtml(html)
        if (!targetText.trim()) throw new Error('페이지에서 텍스트를 추출할 수 없습니다.')
      }

      // 1. 단어 추출 + 빈도수
      const rawWords = analyzeText(targetText, { removeStopwords, ignoreCase })
      if (!rawWords.length) throw new Error('추출된 단어가 없습니다.')

      // 상위 30개까지만 (API 호출 제한)
      const topWords = rawWords.slice(0, 30)

      // 2. 사전 정보 병합
      const enriched = await enrichWithDictionary(topWords, targetText)
      setWords(enriched)
    } catch (e) {
      setError(e.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, text, url, removeStopwords, ignoreCase])

  // ── Save JSON ──
  const handleSave = useCallback(() => {
    if (!words.length) return
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `word-catcher-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [words])

  // ── Load JSON ──
  const handleLoad = useCallback(() => {
    jsonInputRef.current?.click()
  }, [])

  const handleJsonFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (Array.isArray(data)) {
          const ranked = data
            .sort((a, b) => (b.count || 0) - (a.count || 0))
            .map((item, i) => ({ ...item, rank: i + 1 }))
          setWords(ranked)
          setError('')
        }
      } catch {
        setError('올바른 JSON 파일이 아닙니다.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  // ── 파일 드롭존 핸들러 ──
  const handleDropZoneClick = () => txtInputRef.current?.click()

  const handleDragOver = (e) => e.preventDefault()

  const handleDrop = async (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.txt') && !file.type.startsWith('text/')) {
      setError('텍스트 파일(.txt)만 지원합니다.')
      return
    }
    // file input에 파일 세팅
    const dt = new DataTransfer()
    dt.items.add(file)
    txtInputRef.current.files = dt.files
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            W
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">Word Catcher</h1>
            <p className="text-xs sm:text-sm text-slate-500">텍스트에서 단어를 잡아드립니다</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">

        {/* Input Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-slate-700 mb-4">입력</h2>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-4">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(i); setError('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  i === activeTab
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Text Input */}
          {activeTab === 0 && (
            <textarea
              className="w-full h-36 sm:h-44 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder:text-slate-400"
              placeholder="여기에 텍스트를 붙여넣으세요..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}

          {/* File Input */}
          {activeTab === 1 && (
            <div
              onClick={handleDropZoneClick}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="w-full h-36 sm:h-44 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-sm hover:border-indigo-300 transition-colors cursor-pointer"
            >
              <UploadIcon />
              <span className="mt-2">.txt 파일을 드래그하거나 클릭하세요</span>
            </div>
          )}

          {/* URL Input */}
          {activeTab === 2 && (
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <LinkIcon />
              </div>
              <input
                type="url"
                className="w-full h-12 pl-10 pr-3 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder:text-slate-400"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          <input ref={txtInputRef} type="file" accept=".txt" className="hidden" />

          {/* Options */}
          <div className="flex flex-wrap gap-3 mt-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={removeStopwords}
                onChange={(e) => setRemoveStopwords(e.target.checked)}
                className="accent-indigo-600 w-4 h-4"
              />
              불용어 제거
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreCase}
                onChange={(e) => setIgnoreCase(e.target.checked)}
                className="accent-indigo-600 w-4 h-4"
              />
              대소문자 무시
            </label>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-3 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-4 w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {loading ? <><SpinnerIcon /> 분석 중...</> : '단어 분석하기'}
          </button>
        </section>

        {/* Results Section */}
        {words.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-semibold text-slate-700">분석 결과</h2>
                <span className="text-xs text-slate-400">총 {words.length}개 단어</span>
              </div>

              {/* Save / Load */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <SaveIcon /> 저장
                </button>
                <button
                  onClick={handleLoad}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <LoadIcon /> 불러오기
                </button>
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleJsonFileChange}
                />
              </div>
            </div>

            {/* Word List */}
            <div className="divide-y divide-slate-100">
              {words.map((item) => (
                <WordRow key={item.rank} item={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400">
        Word Catcher &copy; 2026
      </footer>
    </div>
  )
}

export default App
