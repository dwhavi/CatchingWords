import STOPWORDS from './stopwords'

/**
 * 텍스트에서 단어를 추출하고 빈도수를 계산
 * @param {string} text - 분석할 텍스트
 * @param {object} options
 * @param {boolean} options.removeStopwords - 불용어 제거 여부
 * @param {boolean} options.ignoreCase - 대소문자 무시 여부
 * @returns {{ word: string, count: number }[]}
 */
export function analyzeText(text, { removeStopwords = true, ignoreCase = true } = {}) {
  if (!text || !text.trim()) return []

  let processed = text.toLowerCase()

  // 단어만 추출 (영문자만)
  const words = processed.match(/[a-z]+/g)
  if (!words) return []

  // 불용어 제거
  const filtered = removeStopwords
    ? words.filter(w => !STOPWORDS.has(w) && w.length > 1)
    : words.filter(w => w.length > 1)

  // 빈도수 계산
  const freq = {}
  for (const w of filtered) {
    freq[w] = (freq[w] || 0) + 1
  }

  // 내림차순 정렬
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }))
}

/**
 * 단어 리스트에 사전 정보를 병합
 * @param {{ word: string, count: number }[]} wordList
 * @returns {Promise<{ rank: number, word: string, count: number, phonetic: string, meaning: string }[]>}
 */
export async function enrichWithDictionary(wordList) {
  const results = []

  // 병렬 처리 but 한 번에 5개씩 제한 (API rate limit 대응)
  const batchSize = 5
  for (let i = 0; i < wordList.length; i += batchSize) {
    const batch = wordList.slice(i, i + batchSize)
    const enriched = await Promise.all(batch.map(lookupWord))
    results.push(...enriched)
  }

  return results.map((item, i) => ({ ...item, rank: i + 1 }))
}

/**
 * 단어 하나를 사전 API에서 조회
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

    // 뜻 (명사 우선, 첫 번째 의미)
    let meaning = ''
    for (const def of entry.meanings || []) {
      if (def.definitions?.length) {
        meaning = def.definitions[0].definition
        break
      }
    }

    return { word, count, phonetic, meaning }
  } catch {
    return { word, count, phonetic: '', meaning: '사전에 없는 단어' }
  }
}
