(function () {
  const currentScript = document.currentScript
  const isEmbedded = (() => {
    try {
      return window.self !== window.top
    } catch {
      return true
    }
  })()

  if (isEmbedded || document.documentElement.dataset.pathforgeArtifactBannerMounted === 'true') {
    return
  }

  const fullPath = currentScript?.dataset.pathforgePath || '/paths'
  const projectTitle = currentScript?.dataset.pathforgeTitle || 'this artifact'
  const provider = currentScript?.dataset.pathforgeProvider
  const modelText = provider ? `Captured from ${provider}.` : 'Captured from a preserved source run.'

  function mountBanner() {
    if (!document.body || document.querySelector('[data-pathforge-artifact-banner]')) return

    document.documentElement.dataset.pathforgeArtifactBannerMounted = 'true'

    const style = document.createElement('style')
    style.textContent = `
      .pathforge-artifact-banner {
        box-sizing: border-box;
        width: min(1180px, 100%);
        margin: 0 auto 16px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(8, 13, 24, 0.86);
        color: #f8fafc;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.22);
      }

      .pathforge-artifact-banner * {
        box-sizing: border-box;
      }

      .pathforge-artifact-banner__inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 12px 14px;
      }

      .pathforge-artifact-banner__copy {
        min-width: 0;
      }

      .pathforge-artifact-banner__eyebrow {
        display: block;
        margin-bottom: 3px;
        color: #fb923c;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.14em;
        line-height: 1.2;
        text-transform: uppercase;
      }

      .pathforge-artifact-banner__title {
        margin: 0;
        color: #f8fafc;
        font-size: 15px;
        font-weight: 900;
        line-height: 1.25;
      }

      .pathforge-artifact-banner__detail {
        margin: 3px 0 0;
        color: #cbd5e1;
        font-size: 12px;
        line-height: 1.45;
      }

      .pathforge-artifact-banner__link {
        display: inline-flex;
        min-height: 40px;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(251, 146, 60, 0.78);
        background: #fb923c;
        color: #111827;
        padding: 9px 12px;
        text-decoration: none;
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        white-space: nowrap;
      }

      .pathforge-artifact-banner__link:focus-visible {
        outline: 3px solid rgba(251, 146, 60, 0.35);
        outline-offset: 3px;
      }

      .pathforge-artifact-banner__link:hover {
        background: #fed7aa;
        border-color: #fed7aa;
      }

      @media (max-width: 620px) {
        .pathforge-artifact-banner {
          margin-bottom: 14px;
        }

        .pathforge-artifact-banner__inner {
          align-items: stretch;
          flex-direction: column;
        }

        .pathforge-artifact-banner__link {
          width: 100%;
        }
      }
    `

    const banner = document.createElement('aside')
    banner.className = 'pathforge-artifact-banner'
    banner.dataset.pathforgeArtifactBanner = 'true'
    banner.setAttribute('aria-label', 'PathForge artifact attribution')
    banner.innerHTML = `
      <div class="pathforge-artifact-banner__inner">
        <div class="pathforge-artifact-banner__copy">
          <span class="pathforge-artifact-banner__eyebrow">PathForge artifact</span>
          <p class="pathforge-artifact-banner__title">Built from a PathForge build path</p>
          <p class="pathforge-artifact-banner__detail">View the prompts, source run, response package, and verification for ${escapeHtml(projectTitle)}. ${escapeHtml(modelText)}</p>
        </div>
        <a class="pathforge-artifact-banner__link" href="${escapeAttribute(fullPath)}">View full path</a>
      </div>
    `

    document.head.appendChild(style)
    document.body.insertBefore(banner, document.body.firstChild)
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]))
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;')
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountBanner, { once: true })
  } else {
    mountBanner()
  }
})()
