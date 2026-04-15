/**
 * 텍스트 파일 읽기
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.readAsText(file)
  })
}

/**
 * URL에서 페이지 내용 가져오기 (CORS 프록시 경유)
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function fetchUrlContent(url) {
  // Vite dev proxy 사용
  try {
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error('페이지를 가져올 수 없습니다.')
    return await res.text()
  } catch {
    throw new Error('페이지를 가져올 수 없습니다. URL을 확인해주세요.')
  }
}

/**
 * HTML에서 메인 텍스트 추출 (간이 파서)
 * @param {string} html
 * @returns {string}
 */
export function extractTextFromHtml(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // 불필요한 태그 제거
  const remove = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript']
  remove.forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => el.remove())
  })

  // main > article > section 순으로 텍스트 추출
  const main = doc.querySelector('main') || doc.querySelector('article') || doc.querySelector('.content') || doc.body

  // 브랜치 구조를 줄바꿈으로 변환
  const text = (main?.innerText || main?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()

  return text
}
