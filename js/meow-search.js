// 本地搜索结果分组：标题命中的文章排在前面，其次是只在正文里命中的；同一篇文章的多处正文命中收在这篇文章下面
// 做法：主题的 local-search.js 在 window load 时才创建搜索实例，这之前替换掉 LocalSearch.prototype.getResultItems，
// 再在结果渲染后插入「标题匹配 / 正文匹配」两个小标题。每篇最多显示几处正文命中由 top_n_per_article 决定
(() => {
  if (typeof LocalSearch === 'undefined') return

  LocalSearch.prototype.getResultItems = function (keywords) {
    const items = []
    this._processedKeywords = null
    const highlightParam = keywords.join(' ')
    const maxSnippets = Math.max(1, parseInt(this.top_n_per_article, 10) || 1)

    this.datas.forEach(({ title, content, url }) => {
      const [indexOfTitle, keysOfTitle] = this.getIndexByWord(keywords, title)
      const [indexOfContent, keysOfContent] = this.getIndexByWord(keywords, content)
      const hitCount = indexOfTitle.length + indexOfContent.length
      if (hitCount === 0) return
      const includedCount = new Set([...keysOfTitle, ...keysOfContent]).size
      const titleHit = indexOfTitle.length > 0
      const titleHtml = titleHit ? this.highlightKeyword(title, this.mergeIntoSlice(0, title.length, indexOfTitle)) : title

      // 正文命中切成片段：每段取命中处前 20、后 100 个字
      let slices = []
      while (indexOfContent.length !== 0) {
        const { position } = indexOfContent[0]
        slices.push(this.mergeIntoSlice(Math.max(0, position - 20), Math.min(content.length, position + 100), indexOfContent))
      }
      const total = slices.length
      // 先按相关度挑出前几段，再按在文中的先后顺序显示
      slices = slices
        .sort((a, b) => b.count - a.count || b.hits.length - a.hits.length || a.start - b.start)
        .slice(0, maxSnippets)
        .sort((a, b) => a.start - b.start)

      const href = new URL(url, location.origin)
      href.searchParams.append('highlight', highlightParam)
      const snippets = slices.map(s =>
        `<a class="meow-snippet" href="${href.href}"><p class="search-result">${s.start > 0 ? '…' : ''}${this.highlightKeyword(content, s)}…</p></a>`).join('')
      const more = total > slices.length ? `<span class="meow-snippet-more">还有 ${total - slices.length} 处</span>` : ''
      const count = total ? `<span class="meow-hit-count">正文 ${total} 处</span>` : ''

      items.push({
        // 必须以这个 <li> 开头：主题靠它加序号
        item: `<li class="local-search-hit-item"><div class="meow-hit" data-group="${titleHit ? 'title' : 'content'}">` +
          `<a href="${href.href}"><span class="search-result-title">${titleHtml}</span>${count}</a>` +
          (snippets ? `<div class="meow-snippets">${snippets}${more}</div>` : '') +
          '</div></li>',
        id: items.length,
        hitCount,
        // 主题按 includedCount 降序排序：标题命中加一个大数，保证排在正文命中前面
        includedCount: includedCount + (titleHit ? 1000 : 0)
      })
    })
    return items
  }

  // 每次渲染结果（含翻页）后，在每组的第一项前面插入小标题
  const addGroupHeads = list => {
    const labels = { title: '标题匹配', content: '正文匹配' }
    for (const group of ['title', 'content']) {
      const first = list.querySelector(`.meow-hit[data-group="${group}"]`)
      if (!first) continue
      const head = document.createElement('li')
      head.className = 'meow-group-head'
      head.textContent = labels[group]
      first.closest('li').before(head)
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const results = document.getElementById('local-search-results')
    if (!results) return
    new MutationObserver(() => {
      const list = results.querySelector('.search-result-list')
      if (list && !list.querySelector('.meow-group-head')) addGroupHeads(list)
    }).observe(results, { childList: true })
  })
})()
