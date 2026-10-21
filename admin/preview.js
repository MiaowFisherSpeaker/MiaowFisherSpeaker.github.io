// 后台文章预览：Sveltia 自带的预览不认 LaTeX，这里换成和网站一样的 markdown-it + KaTeX 渲染正文
// 公式先抽出来单独交给 KaTeX，避免 markdown 把公式里的 _ \ 当成格式符号；代码块里的 $ 不处理
(() => {
  const { React } = window.CMS
  const h = React.createElement
  // 和 _config.yml 的 markdown.render 保持一致
  const md = window.markdownit({ html: true, xhtmlOut: true, breaks: true, linkify: true, typographer: true })

  // 正文里的图片写的是文件名（Hexo 资源文件夹），交给 getAsset 换成后台能显示的地址
  let getAsset = null
  const baseImage = md.renderer.rules.image
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx], src = token.attrGet('src')
    if (getAsset && src && !/^(https?:|data:|\/)/.test(src)) token.attrSet('src', String(getAsset(src) ?? src))
    return baseImage(tokens, idx, options, env, self)
  }

  const tex = (src, displayMode) => window.katex.renderToString(src, { displayMode, throwOnError: false })
  const MATH = /(```[\s\S]*?```|`[^`\n]+`)|\$\$([\s\S]+?)\$\$|\$(?!\s)((?:\\\$|[^$\n])+?)(?<!\s)\$(?!\d)/g

  function render(body) {
    const blocks = [], inlines = []
    const text = body.replace(MATH, (all, code, block, inline) => {
      if (code) return code
      if (block !== undefined) return `\n\nKATEXBLOCK${blocks.push(tex(block.trim(), true)) - 1}X\n\n`
      return `KATEXINLINE${inlines.push(tex(inline, false)) - 1}X`
    })
    return md.render(text)
      .replace(/<p>KATEXBLOCK(\d+)X<\/p>/g, (_, i) => blocks[i])
      .replace(/KATEXBLOCK(\d+)X/g, (_, i) => blocks[i])
      .replace(/KATEXINLINE(\d+)X/g, (_, i) => inlines[i])
  }

  const PostPreview = ({ entry, getAsset: assetOf }) => {
    const data = entry.get('data')
    getAsset = assetOf
    const html = render(data.get('body') ?? '')
    return h('article', { className: 'meow-preview' },
      h('h1', null, data.get('title') ?? ''),
      data.get('description') ? h('blockquote', null, data.get('description')) : null,
      h('div', { dangerouslySetInnerHTML: { __html: html } }))
  }

  window.CMS.registerPreviewTemplate('posts', PostPreview)
  window.CMS.registerPreviewStyle('https://cdn.jsdelivr.net/npm/katex@0.19.0/dist/katex.min.css')
  window.CMS.registerPreviewStyle(`
    .meow-preview { font: 17px/1.9 "LXGW WenKai Screen", "PingFang SC", system-ui, sans-serif; color: #4a3a40; max-width: 860px; margin: 0 auto; padding: 8px 20px 40px; }
    .meow-preview h1, .meow-preview h2, .meow-preview h3 { color: #c95f82; line-height: 1.4; }
    .meow-preview a { color: #d36f8f; }
    .meow-preview img { max-width: 100%; border-radius: 8px; }
    .meow-preview blockquote { margin: 1em 0; padding: .6em 1em; border-left: 4px solid #e899b0; background: #fdf0f4; color: #7a5a66; }
    .meow-preview table { border-collapse: collapse; display: block; overflow-x: auto; }
    .meow-preview th, .meow-preview td { border: 1px solid #f2c4d0; padding: .4em .7em; }
    .meow-preview th { background: #fdeef3; }
    .meow-preview code { color: #c0507a; background: #fbeef1; padding: 0 .3em; border-radius: 4px; font-size: .9em; }
    .meow-preview pre { background: #fbf5f7; padding: 1em; border-radius: 8px; overflow-x: auto; }
    .meow-preview pre code { color: inherit; background: none; padding: 0; }
    .meow-preview .katex-display { overflow-x: auto; overflow-y: hidden; }
  `, { raw: true })
})()
