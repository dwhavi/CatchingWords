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
 * 단어 리스트에 사전 정보 + 한국어 번역 병합
 */
export async function enrichWithDictionary(wordList) {
  const results = []

  const batchSize = 3
  for (let i = 0; i < wordList.length; i += batchSize) {
    const batch = wordList.slice(i, i + batchSize)
    const enriched = await Promise.all(batch.map(lookupWord))
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
 * 단어 하나를 영-영 사전에서 조회 + 한국어 번역
 */
async function lookupWord({ word, count }) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    if (!res.ok) throw new Error('Not found')
    const data = await res.json()
    const entry = data[0]

    // 발음기호
    const phonetic = entry.phonetic
      || entry.phonetics?.find(p => p.text)?.text
      || entry.phonetics?.find(p => p.audio)?.text
      || ''

    // 영어 뜻 (명사 우선, 첫 번째 의미)
    let meaningEn = ''
    for (const def of entry.meanings || []) {
      if (def.definitions?.length) {
        meaningEn = def.definitions[0].definition
        break
      }
    }

    // 한국어 번역
    const meaningKo = await translateToKorean(meaningEn || word)

    return { word, count, phonetic, meaningEn, meaningKo }
  } catch {
    // 사전에 없으면 번역만 시도
    const meaningKo = await translateToKorean(word)
    return { word, count, phonetic: '', meaningEn: '', meaningKo }
  }
}
