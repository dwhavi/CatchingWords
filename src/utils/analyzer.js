import STOPWORDS from './stopwords'

/**
 * 텍스트에서 단어를 추출하고 빈도수를 계산
 */
export function analyzeText(text, { removeStopwords = true, ignoreCase = true } = {}) {
  if (!text || !text.trim()) return []

  let processed = text.toLowerCase()
  const words = processed.match(/[a-z]+/g)
  if (!words) return []

  const filtered = removeStopwords
    ? words.filter(w => !STOPWORDS.has(w) && w.length > 1)
    : words.filter(w => w.length > 1)

  const freq = {}
  for (const w of filtered) {
    freq[w] = (freq[w] || 0) + 1
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }))
}

/**
 * 원문에서 단어가 포함된 문장 추출 (최대 3개)
 */
export function extractSentences(text, word, maxCount = 3) {
  const sentences = text.match(/[^.!?]+[.!?]+/g)
  if (!sentences) return []

  const lowerWord = word.toLowerCase()
  return sentences
    .map(s => s.trim())
    .filter(s => {
      const lower = s.toLowerCase()
      return lower.includes(lowerWord) && /\b/.test(lowerWord)
    })
    .slice(0, maxCount)
}

/**
 * 단어 리스트에 사전 정보 + 문장 + 한국어 번역 병합
 */
export async function enrichWithDictionary(wordList, fullText) {
  const results = []

  const batchSize = 3
  for (let i = 0; i < wordList.length; i += batchSize) {
    const batch = wordList.slice(i, i + batchSize)
    const enriched = await Promise.all(batch.map(item => lookupWord(item, fullText)))
    results.push(...enriched)
  }

  return results.map((item, i) => ({ ...item, rank: i + 1 }))
}

/**
 * MyMemory API로 영→한 번역
 */
async function translateToKorean(text) {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ko`
    )
    if (!res.ok) throw new Error('Translation failed')
    const data = await res.json()
    return data.responseData?.translatedText || ''
  } catch {
    return ''
  }
}

/**
 * 단어 하나를 영-영 사전에서 조회 + 문장 추출 + 한국어 번역
 */
async function lookupWord({ word, count }, fullText) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    if (!res.ok) throw new Error('Not found')
    const data = await res.json()
    const entry = data[0]

    const phonetic = entry.phonetic
      || entry.phonetics?.find(p => p.text)?.text
      || entry.phonetics?.find(p => p.audio)?.text
      || ''

    let meaningEn = ''
    for (const def of entry.meanings || []) {
      if (def.definitions?.length) {
        meaningEn = def.definitions[0].definition
        break
      }
    }

    const meaningKo = await translateToKorean(meaningEn || word)

    // 원문에서 단어가 포함된 문장 추출
    const sentences = extractSentences(fullText, word, 3)

    // 문장 한국어 번역
    const sentenceTranslations = []
    for (const sentence of sentences) {
      const ko = await translateToKorean(sentence)
      sentenceTranslations.push({ en: sentence, ko })
    }

    return { word, count, phonetic, meaningEn, meaningKo, sentences: sentenceTranslations }
  } catch {
    // 사전에 없으면 문장 + 번역만
    const sentences = extractSentences(fullText, word, 3)
    const sentenceTranslations = []
    for (const sentence of sentences) {
      const ko = await translateToKorean(sentence)
      sentenceTranslations.push({ en: sentence, ko })
    }
    const meaningKo = await translateToKorean(word)
    return { word, count, phonetic: '', meaningEn: '', meaningKo, sentences: sentenceTranslations }
  }
}
