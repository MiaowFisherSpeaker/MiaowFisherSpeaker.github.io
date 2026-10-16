// 小动物客人页：每张卡片的徽章默认只显示一行，多出来的收进「+N 枚」按钮里（scripts/guests.js 生成卡片）
(() => {
  const label = (btn, n) => { btn.textContent = btn.getAttribute('aria-expanded') === 'true' ? '收起' : `+${n} 枚` }

  function setup() {
    document.querySelectorAll('.fan-card').forEach(card => {
      const box = card.querySelector('.fan-badges')
      const btn = card.querySelector('.fan-badges-more')
      if (!box || !btn) return
      const items = [...box.children]
      items.forEach(el => el.classList.remove('is-extra'))   // 先全部显示，再量哪些排不进第一行
      const top = items[0].offsetTop
      const extra = items.filter(el => el.offsetTop > top + 4)
      extra.forEach(el => el.classList.add('is-extra'))
      const hidden = extra.length
      btn.dataset.n = hidden
      btn.hidden = !hidden && btn.getAttribute('aria-expanded') !== 'true'
      label(btn, hidden)
    })
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.fan-badges-more')
    if (!btn) return
    const open = btn.getAttribute('aria-expanded') !== 'true'
    btn.setAttribute('aria-expanded', String(open))
    btn.previousElementSibling.classList.toggle('is-open', open)
    label(btn, btn.dataset.n)
  })

  let timer
  const later = () => { clearTimeout(timer); timer = setTimeout(setup, 120) }
  document.addEventListener('DOMContentLoaded', setup)
  document.addEventListener('pjax:complete', setup)
  window.addEventListener('resize', later)
  document.fonts?.ready.then(setup)
  if (document.readyState !== 'loading') setup()
})()
