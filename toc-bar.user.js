// ==UserScript==
// @name              Toc Bar, auto-generating table of content
// @name:zh-CN        Toc Bar, 自动生成文章大纲。知乎、微信公众号等阅读好伴侣
// @author            Kong-void
// @namespace         https://github.com/Kong-void
// @license           MIT
// @description       A floating table of content widget
// @description:zh-CN 自动生成文章大纲目录，在页面右侧展示一个浮动组件。覆盖常用在线阅读资讯站（技术向）。github/medium/MDN/掘金/简书等
// @version           1.0
// @match             *://www.jianshu.com/p/*
// @match             *://cdn2.jianshu.io/p/*
// @match             *://zhuanlan.zhihu.com/p/*
// @match             *://www.zhihu.com/pub/reader/*
// @match             *://mp.weixin.qq.com/s*
// @match             *://cnodejs.org/topic/*
// @match             *://*zcfy.cc/article/*
// @match             *://juejin.cn/post/*
// @match             *://juejin.cn/book/*
// @match             *://dev.to/*/*
// @exclude           *://dev.to/settings/*
// @match             *://web.dev/*
// @match             *://medium.com/*
// @exclude           *://medium.com/media/*
// @match             *://itnext.io/*
// @match             *://python-patterns.guide/*
// @match             *://www.mysqltutorial.org/*
// @match             *://en.wikipedia.org/*
// @match             *://vuejs.org/*
// @match             *://docs.python.org/*
// @match             *://packaging.python.org/*
// @match             *://*.readthedocs.io/*
// @match             *://docs.djangoproject.com/*
// @match             *://www.cnblogs.com/*
// @match             *://bigsearcher.com/*
// @match             *://ffmpeg.org/*
// @match             *://www.ruanyifeng.com/*
// @match             *://stackoverflow.blog/*
// @match             *://realpython.com/*
// @match             *://www.infoq.cn/article/*
// @match             *://towardsdatascience.com/*
// @match             *://hackernoon.com/*
// @match             *://css-tricks.com/*
// @match             *://www.smashingmagazine.com/*/*
// @match             *://distill.pub/*
// @match             *://github.com/*/*
// @match             *://github.com/*/issues/*
// @match             *://developer.mozilla.org/*/docs/*
// @match             *://learning.oreilly.com/library/view/*
// @match             *://developer.chrome.com/extensions/*
// @match             *://app.getpocket.com/read/*
// @match             *://indepth.dev/posts/*
// @match             *://gitlab.com/*
// @run-at            document-idle
// @grant             GM_addStyle
// @grant             GM_setValue
// @grant             GM_getValue
// @grant             GM_registerMenuCommand
// @grant             GM_unregisterMenuCommand
// @require           https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.18.2/tocbot.min.js
// @icon              https://raw.githubusercontent.com/Kong-void/toc-bar-userscript/master/toc-logo.svg
// ==/UserScript==

/*
  Derived from an MIT-licensed project (https://github.com/hikerpigtoc-bar-userscript).
  If you redistribute this script, keep the original MIT license notice.
*/

(function () {
  /** @type {{[key: string]: Partial<any>|Function}} */
  const SITE_SETTINGS = {
    jianshu: {
      contentSelector: '.ouvJEz',
      style: { top: '55px', color: '#ea6f5a' },
    },
    'zhuanlan.zhihu.com': {
      contentSelector: 'article',
      scrollSmoothOffset: -52,
      shouldShow() {
        return location.pathname.startsWith('/p/');
      },
    },
    'www.zhihu.com': {
      contentSelector: '.reader-chapter-content',
      scrollSmoothOffset: -52,
    },
    zcfy: { contentSelector: '.markdown-body' },
    qq: { contentSelector: '.rich_media_content' },
    'juejin.cn': function () {
      let contentSelector = '.article';
      if (/\/book\//.test(location.pathname)) contentSelector = '.book-body';
      return { contentSelector };
    },
    'dev.to': {
      contentSelector: 'article',
      scrollSmoothOffset: -56,
      shouldShow() {
        return ['/search', '/top/'].every((s) => !location.pathname.startsWith(s));
      },
    },
    'medium.com': { contentSelector: 'article' },
    'docs.djangoproject.com': { contentSelector: '#docs-content' },
    'hackernoon.com': { contentSelector: 'main', scrollSmoothOffset: -80 },
    'towardsdatascience.com': { contentSelector: 'article' },
    'css-tricks.com': { contentSelector: 'main' },
    'distill.pub': { contentSelector: 'body' },
    smashingmagazine: { contentSelector: 'article' },
    'web.dev': { contentSelector: '#content' },
    'python-patterns.guide': { contentSelector: '.section' },
    'www.mysqltutorial.org': { contentSelector: 'article' },

    'github.com': function () {
      const README_SEL = '.entry-content';
      const WIKI_CONTENT_SEL = '#wiki-body';
      const ISSUE_CONTENT_SEL = '.comment .comment-body';

      const matchedSel = [README_SEL, ISSUE_CONTENT_SEL, WIKI_CONTENT_SEL].find(
        (sel) => !!document.querySelector(sel)
      );
      if (!matchedSel) return { contentSelector: false };

      const isIssueDetail = /\/issues\//.test(location.pathname);
      const ISSUE_DETAIL_HEADING_OFFSET = 60;

      const onClick = isIssueDetail
        ? function (e) {
            const href = e.target.getAttribute('href');
            if (!href) return;
            const header = document.body.querySelector(href);
            if (header) {
              const rect = header.getBoundingClientRect();
              const currentWindowScrollTop = document.documentElement.scrollTop;
              const scrollY = rect.y + currentWindowScrollTop - ISSUE_DETAIL_HEADING_OFFSET;
              window.scrollTo(0, scrollY);
              location.hash = href;
              e.preventDefault();
              e.stopPropagation();
            }
          }
        : null;

      return {
        siteName: 'github.com',
        contentSelector: matchedSel,
        hasInnerContainers: isIssueDetail ? true : false,
        scrollSmoothOffset: isIssueDetail ? -ISSUE_DETAIL_HEADING_OFFSET : 0,
        headingsOffset: isIssueDetail ? ISSUE_DETAIL_HEADING_OFFSET : 0,
        initialTop: 100,
        onClick,
        findHeaderId(ele) {
          let id;
          let anchor = ele.querySelector('.anchor');
          if (anchor) id = anchor.getAttribute('id');

          if (!anchor) {
            anchor = ele.querySelector('a');
            if (anchor && anchor.hash) id = anchor.hash.replace(/^#/, '');
          }
          return id;
        },
      };
    },

    'developer.mozilla.org': {
      contentSelector: '#content',
      onInit() {
        setTimeout(() => {
          try {
            tocbot.refresh();
          } catch (e) {}
        }, 2000);
      },
    },
    'learning.oreilly.com': { contentSelector: '#sbo-rt-content' },
    'developer.chrome.com': { contentSelector: 'article' },
    'www.infoq.cn': { contentSelector: '.article-main', scrollSmoothOffset: -107 },
    'app.getpocket.com': { contentSelector: '[role=main]' },
    'indepth.dev': { contentSelector: '.content' },
    'gitlab.com': { contentSelector: '.file-content', scrollSmoothOffset: -40 },
    'docs.celeryproject.org': { contentSelector: '[role=main]' },
    'docs.python.org': { contentSelector: '[role=main]' },
    'packaging.python.org': { contentSelector: '[role=main]' },
    'readthedocs.io': { contentSelector: '[role=main]' },
    'bigsearcher.com': { contentSelector: 'body' },
    'ffmpeg.org': { contentSelector: '#page-content-wrapper' },
    'www.ruanyifeng.com': { contentSelector: 'article' },
    'realpython.com': { contentSelector: '.main-content' },
    'en.wikipedia.org': { contentSelector: '#content' },
    'www.cnblogs.com': { contentSelector: '#main' },
    'stackoverflow.blog': { contentSelector: 'article' },
    'vuejs.org': { contentSelector: 'main > div' },
  };

  function getSiteInfo() {
    let siteName;
    if (SITE_SETTINGS[location.hostname]) {
      siteName = location.hostname;
    } else if (location.hostname.indexOf('readthedocs.io') > -1) {
      siteName = 'readthedocs.io';
    } else {
      const match = location.href.match(/([\d\w]+)\.(com|cn|net|org|im|io|cc|site|tv)/i);
      siteName = match ? match[1] : null;
    }
    if (siteName && SITE_SETTINGS[siteName]) {
      return { siteName, siteSetting: SITE_SETTINGS[siteName] };
    }
  }

  function getPageTocOptions() {
    const siteInfo = getSiteInfo();
    if (!siteInfo) return;

    let siteSetting =
      typeof siteInfo.siteSetting === 'function'
        ? siteInfo.siteSetting()
        : { ...siteInfo.siteSetting };

    if (!siteSetting) return;
    if (siteSetting.shouldShow && !siteSetting.shouldShow()) return;

    if (typeof siteSetting.contentSelector === 'function') {
      const contentSelector = siteSetting.contentSelector();
      if (!contentSelector) return;
      siteSetting = { ...siteSetting, contentSelector };
    }
    if (!siteSetting.contentSelector) return;

    if (typeof siteSetting.scrollSmoothOffset === 'function') {
      siteSetting.scrollSmoothOffset = siteSetting.scrollSmoothOffset();
    }

    return { siteName: siteInfo.siteName, ...siteSetting };
  }

  function guessThemeColor() {
    const meta = document.head.querySelector('meta[name="theme-color"]');
    if (meta) return meta.getAttribute('content');
  }

  function doContentHash(content) {
    return content
      .split('')
      .reduce((prevHash, currVal) => (((prevHash << 5) - prevHash + currVal.charCodeAt(0)) | 0), 0)
      .toString(32);
  }

  function toIntPx(v, fallback = 0) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  function getCssPx(el, prop, fallback = 0) {
    return toIntPx(el.style[prop] || window.getComputedStyle(el)[prop], fallback);
  }
  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }
  function getViewportWidth() {
    return document.documentElement.clientWidth || window.innerWidth || 0;
  }

  const POSITION_STORAGE = {
    cache: null,
    checkCache() {
      if (!POSITION_STORAGE.cache) {
        POSITION_STORAGE.cache = GM_getValue('tocbar-positions', {});
      }
    },
    get(k) {
      k = k || location.host;
      POSITION_STORAGE.checkCache();
      return POSITION_STORAGE.cache[k];
    },
    set(k, position) {
      k = k || location.host;
      POSITION_STORAGE.checkCache();
      POSITION_STORAGE.cache[k] = position;
      GM_setValue('tocbar-positions', POSITION_STORAGE.cache);
    },
  };

  const TOC_BAR_WIDTH = 340;
  const TOC_BAR_COLLAPSED_WIDTH = 30;
  const TOCBOT_CONTAINTER_CLASS = 'toc-bar__toc';

  // 兼容旧版
  const DARKMODE_KEY = 'tocbar-darkmode';

  // 新版主题策略
  const THEME_MODE_KEY = 'tocbar-theme-mode'; // auto-system | manual-light | manual-dark | auto-solar
  const SOLAR_CONFIG_KEY = 'tocbar-solar-config'; // {lat, lng}
  const THEME_CHECK_INTERVAL = 5 * 60 * 1000;

  // 交互开关（默认关闭）
  const ESC_COLLAPSE_ENABLED_KEY = 'tocbar-esc-collapse-enabled';
  const OUTSIDE_CLICK_COLLAPSE_ENABLED_KEY = 'tocbar-outside-click-collapse-enabled';

  const InteractionSettings = (() => {
    let escCollapseEnabled = GM_getValue(ESC_COLLAPSE_ENABLED_KEY, false);
    let outsideClickCollapseEnabled = GM_getValue(OUTSIDE_CLICK_COLLAPSE_ENABLED_KEY, false);

    return {
      getEscCollapseEnabled() {
        return escCollapseEnabled;
      },
      setEscCollapseEnabled(v) {
        escCollapseEnabled = Boolean(v);
        GM_setValue(ESC_COLLAPSE_ENABLED_KEY, escCollapseEnabled);
      },
      getOutsideClickCollapseEnabled() {
        return outsideClickCollapseEnabled;
      },
      setOutsideClickCollapseEnabled(v) {
        outsideClickCollapseEnabled = Boolean(v);
        GM_setValue(OUTSIDE_CLICK_COLLAPSE_ENABLED_KEY, outsideClickCollapseEnabled);
      },
    };
  })();

  const TOC_BAR_STYLE = `
.toc-bar {
  --toc-bar-active-color: #54BC4B;
  --toc-bar-text-color: #333;
  --toc-bar-background-color: #FEFEFE;

  position: fixed;
  z-index: 9000;
  right: 5px;
  top: 80px;
  width: ${TOC_BAR_WIDTH}px;
  max-height: calc(100vh - 12px);
  overflow: hidden;
  font-size: 14px;
  box-sizing: border-box;
  padding: 0 10px 10px 0;
  box-shadow: 0 1px 3px #DDD;
  border-radius: 4px;
  transition: width 0.2s ease;
  color: var(--toc-bar-text-color);
  background: var(--toc-bar-background-color);

  user-select:none;
  -moz-user-select:none;
  -webkit-user-select: none;
  -ms-user-select: none;
}

.toc-bar[colorscheme="dark"] {
  --toc-bar-text-color: #fafafa;
  --toc-bar-background-color: #333;
}
.toc-bar[colorscheme="dark"] svg {
  fill: var(--toc-bar-text-color);
  stroke: var(--toc-bar-text-color);
}

/* 左锚点：让 right 不干扰 left */
.toc-bar.toc-bar--anchor-left {
  right: auto !important;
}
.toc-bar.toc-bar--anchor-left .toc-bar__header {
  flex-direction: row-reverse;
}
.toc-bar.toc-bar--anchor-left .toc-bar__actions {
  flex-direction: row-reverse;
}
.toc-bar.toc-bar--anchor-left .toc-bar__title {
  margin-left: 0;
  margin-right: 5px;
}

.toc-bar.toc-bar--collapsed {
  width: ${TOC_BAR_COLLAPSED_WIDTH}px;
  height: ${TOC_BAR_COLLAPSED_WIDTH}px;
  padding: 0;
  overflow: hidden;
}

.toc-bar--collapsed .hidden-when-collapsed { display: none; }

.toc-bar__header {
  font-weight: bold;
  padding-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
}

.toc-bar__refresh { position: relative; top: -2px; }

.toc-bar__icon-btn {
  height: 1em;
  width: 1em;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.toc-bar__icon-btn:hover { opacity: 0.7; }
.toc-bar__icon-btn svg {
  max-width: 100%;
  max-height: 100%;
  vertical-align: top;
}

.toc-bar__actions { align-items: center; gap: 1em; }
.toc-bar__scheme { transform: translateY(-1px) scale(1.1); }
.toc-bar__header-left { align-items: center; }
.toc-bar__toggle { cursor: pointer; padding: 8px 8px; box-sizing: content-box; transition: transform 0.2s ease; }
.toc-bar__title { margin-left: 5px; }

.toc-bar a.toc-link {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  line-height: 1.6;
}

.flex { display: flex; }

/* tocbot */
.toc-bar__toc {
  max-height: calc(100vh - 110px);
  overflow-y: auto;
  overflow-x: hidden;
}
.toc-list-item > a:hover { text-decoration: underline; }
.toc-list { padding-inline-start: 0; }

.toc-bar__toc > .toc-list {
  margin: 0;
  overflow: hidden;
  position: relative;
  padding-left: 5px;
}
.toc-bar__toc > .toc-list li {
  list-style: none;
  padding-left: 8px;
  position: static;
}
a.toc-link { color: currentColor; height: 100%; }

.is-collapsible {
  max-height: 1000px;
  overflow: hidden;
  transition: all 300ms ease-in-out;
}
.is-collapsed { max-height: 0; }

.is-active-link { font-weight: 700; }

.toc-link::before {
  background-color: var(--toc-bar-background-color);
  content: ' ';
  display: inline-block;
  height: inherit;
  left: 0;
  margin-top: -1px;
  position: absolute;
  width: 2px;
}
.is-active-link::before { background-color: var(--toc-bar-active-color); }

.toc-list-item, .toc-link { font-size: 1em; }

#toc-bar-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%) translateY(10px);
  z-index: 999999;
  background: rgba(0, 0, 0, .78);
  color: #fff;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 8px;
  pointer-events: none;
  opacity: 0;
  transition: all .2s ease;
}
#toc-bar-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media print {
  .toc-bar__no-print { display: none !important; }
}
`;
  GM_addStyle(TOC_BAR_STYLE);

  function showToast(message, duration = 1600) {
    let el = document.getElementById('toc-bar-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toc-bar-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.remove('show'), duration);
  }
  showToast._timer = null;

  const TOC_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="8" y1="6" x2="21" y2="6"></line>
  <line x1="8" y1="12" x2="21" y2="12"></line>
  <line x1="8" y1="18" x2="21" y2="18"></line>
  <circle cx="4" cy="6" r="1"></circle>
  <circle cx="4" cy="12" r="1"></circle>
  <circle cx="4" cy="18" r="1"></circle>
</svg>`;

  const REFRESH_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polyline points="23 4 23 10 17 10"></polyline>
  <polyline points="1 20 1 14 7 14"></polyline>
  <path d="M3.5 9a9 9 0 0 1 14.13-3.36L23 10M1 14l5.37 4.36A9 9 0 0 0 20.5 15"></path>
</svg>`;

  const LIGHT_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="5"></circle>
  <line x1="12" y1="1" x2="12" y2="3"></line>
  <line x1="12" y1="21" x2="12" y2="23"></line>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
  <line x1="1" y1="12" x2="3" y2="12"></line>
  <line x1="21" y1="12" x2="23" y2="12"></line>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
</svg>`;

  function TocBar(options = {}) {
    this.options = options;

    POSITION_STORAGE.checkCache();
    const cachedPosition = POSITION_STORAGE.get(options.siteName) || {};
    this.anchor = cachedPosition.anchor === 'left' ? 'left' : 'right';

    this.element = document.createElement('div');
    this.element.id = 'toc-bar';
    this.element.classList.add('toc-bar', 'toc-bar__no-print');
    if (this.anchor === 'left') this.element.classList.add('toc-bar--anchor-left');

    // site style first (then cache override)
    if (options.style && typeof options.style === 'object') {
      Object.assign(this.element.style, options.style);
    }

    // position top
    if (typeof cachedPosition.top === 'number') {
      this.element.style.top = `${Math.max(0, cachedPosition.top)}px`;
    } else if (!this.element.style.top && options.hasOwnProperty('initialTop')) {
      this.element.style.top = `${Math.max(0, options.initialTop)}px`;
    }

    // position left/right
    const vw = getViewportWidth();
    if (this.anchor === 'left') {
      let left =
        typeof cachedPosition.left === 'number'
          ? cachedPosition.left
          : (typeof cachedPosition.right === 'number'
              ? vw - cachedPosition.right - TOC_BAR_WIDTH
              : (this.element.style.left ? getCssPx(this.element, 'left', 5) : 5));
      this.element.style.left = `${Math.max(0, left)}px`;
      this.element.style.right = '';
    } else {
      if (typeof cachedPosition.right === 'number') {
        this.element.style.right = `${Math.max(0, cachedPosition.right)}px`;
      } else if (this.element.style.right) {
        this.element.style.right = `${Math.max(0, getCssPx(this.element, 'right', 5))}px`;
      }
      this.element.style.left = '';
    }

    document.body.appendChild(this.element);

    this.visible = true;
    this._suppressNextClick = false;

    this.initHeader();

    const tocElement = document.createElement('div');
    this.tocElement = tocElement;
    tocElement.classList.add(TOCBOT_CONTAINTER_CLASS);
    this.element.appendChild(tocElement);

    const isDark = Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    this.isDarkMode = isDark;
    this.element.setAttribute('colorscheme', isDark ? 'dark' : 'light');

    // initial collapse
    if (GM_getValue('tocbar-hidden', false)) {
      this.toggle(false, { persist: false, autoAnchor: true });
    } else {
      this.clampPosition();
      this.savePosition();
    }
  }

  TocBar.prototype = {
    getCurrentWidth() {
      return this.visible ? TOC_BAR_WIDTH : TOC_BAR_COLLAPSED_WIDTH;
    },

    clampPosition() {
      const vw = getViewportWidth();
      const width = this.getCurrentWidth();
      const maxOffset = Math.max(0, vw - width);

      const top = Math.max(0, getCssPx(this.element, 'top', 80));
      this.element.style.top = `${top}px`;

      if (this.anchor === 'left') {
        const left = clamp(getCssPx(this.element, 'left', 5), 0, maxOffset);
        this.element.style.left = `${left}px`;
      } else {
        const right = clamp(getCssPx(this.element, 'right', 5), 0, maxOffset);
        this.element.style.right = `${right}px`;
      }
    },

    savePosition() {
      const pos = {
        top: getCssPx(this.element, 'top', 80),
        anchor: this.anchor,
      };
      if (this.anchor === 'left') pos.left = getCssPx(this.element, 'left', 5);
      else pos.right = getCssPx(this.element, 'right', 5);

      POSITION_STORAGE.set(this.options.siteName, pos);
    },

    setAnchor(nextAnchor, { keepRect = true } = {}) {
      if (nextAnchor !== 'left' && nextAnchor !== 'right') return;
      if (nextAnchor === this.anchor) return;

      const vw = getViewportWidth();
      const bbox = this.element.getBoundingClientRect();

      if (nextAnchor === 'left') {
        const left = keepRect ? bbox.left : getCssPx(this.element, 'left', bbox.left);
        this.anchor = 'left';
        this.element.classList.add('toc-bar--anchor-left');
        this.element.style.left = `${Math.max(0, left)}px`;
        this.element.style.right = '';
      } else {
        const right = keepRect ? (vw - bbox.right) : getCssPx(this.element, 'right', vw - bbox.right);
        this.anchor = 'right';
        this.element.classList.remove('toc-bar--anchor-left');
        this.element.style.right = `${Math.max(0, right)}px`;
        this.element.style.left = '';
      }
    },

    /**
     * 核心：每次展开/收起前都根据“当前位置”选择锚点
     * - 更靠左 -> left锚点（展开向右、收起向左）
     * - 更靠右 -> right锚点（展开向左、收起向右）
     * 同时会考虑 targetWidth 防止展开溢出。
     */
    chooseAnchorForToggle(targetWidth) {
      const vw = getViewportWidth();
      if (!vw) return;

      const bbox = this.element.getBoundingClientRect();

      // 1) 先用“离哪条边更近”作为偏好（比 center 更符合直觉）
      const distLeft = bbox.left;
      const distRight = vw - bbox.right;
      let preferred = distLeft <= distRight ? 'left' : 'right';

      // 2) 计算两种锚点在 targetWidth 下的溢出量
      // left锚点：左边界固定在 bbox.left，右边界 = bbox.left + targetWidth
      const overflowIfLeft = Math.max(0, bbox.left + targetWidth - vw);
      // right锚点：右边界固定在 bbox.right，左边界 = bbox.right - targetWidth
      const overflowIfRight = Math.max(0, targetWidth - bbox.right);

      let chosen = preferred;

      // 3) 如果 preferred 会溢出但另一侧不溢出，则换边；都溢出则选溢出更小的一边
      if (preferred === 'left') {
        if (overflowIfLeft > 0 && overflowIfRight === 0) chosen = 'right';
        else if (overflowIfLeft > 0 && overflowIfRight > 0) chosen = overflowIfRight < overflowIfLeft ? 'right' : 'left';
      } else {
        if (overflowIfRight > 0 && overflowIfLeft === 0) chosen = 'left';
        else if (overflowIfRight > 0 && overflowIfLeft > 0) chosen = overflowIfLeft < overflowIfRight ? 'left' : 'right';
      }

      this.setAnchor(chosen, { keepRect: true });
    },

    collapseWithFeedback() {
      if (!this.visible) return;
      this.toggle(false);
      GM_setValue('tocbar-hidden', true);
      showToast('TOC 已收起');
    },

    initHeader() {
      const header = document.createElement('div');
      header.classList.add('toc-bar__header');
      header.innerHTML = `
        <div class="flex toc-bar__header-left">
          <div class="toc-bar__title hidden-when-collapsed">TOC Bar</div>
        </div>
        <div class="toc-bar__actions flex">
          <div class="toc-bar__scheme toc-bar__icon-btn hidden-when-collapsed" title="Toggle Light/Dark Mode">
            ${LIGHT_ICON}
          </div>
          <div class="toc-bar__refresh toc-bar__icon-btn hidden-when-collapsed" title="Refresh TOC">
            ${REFRESH_ICON}
          </div>
          <div class="toc-bar__toggle toc-bar__icon-btn" title="Toggle TOC Bar">
            ${TOC_ICON}
          </div>
        </div>
      `;

      const toggleElement = header.querySelector('.toc-bar__toggle');
      toggleElement.addEventListener('click', (e) => {
        if (this._suppressNextClick) {
          this._suppressNextClick = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        this.toggle();
        GM_setValue('tocbar-hidden', !this.visible);
        showToast(this.visible ? 'TOC 已展开' : 'TOC 已收起');
      });

      const refreshElement = header.querySelector('.toc-bar__refresh');
      refreshElement.addEventListener('click', () => {
        try {
          tocbot.refresh();
          showToast('TOC 已刷新');
        } catch (error) {
          console.warn('error in tocbot.refresh', error);
          showToast('TOC 刷新失败');
        }
      });

      const toggleSchemeElement = header.querySelector('.toc-bar__scheme');
      toggleSchemeElement.addEventListener('click', () => {
        const nextDark = !this.isDarkMode;
        ThemeController.setMode(nextDark ? 'manual-dark' : 'manual-light', true);
      });

      // 展开态：单击 header 空白区域收起（方案A）
      header.addEventListener('click', (e) => {
        if (!this.visible) return;

        if (this._suppressNextClick) {
          this._suppressNextClick = false;
          return;
        }
        if (e.target.closest('.toc-bar__icon-btn')) return;

        this.collapseWithFeedback();
      });

      // Drag
      const DRAG_THRESHOLD = 3;
      const dragState = {
        startMouseX: 0,
        startMouseY: 0,
        startTop: 0,
        startOffset: 0,
        isDragging: false,
        hasMoved: false,
        anchor: 'right',
        curTop: 0,
        curOffset: 0,
      };

      const onMouseMove = (e) => {
        if (!dragState.isDragging) return;

        const deltaX = e.pageX - dragState.startMouseX;
        const deltaY = e.pageY - dragState.startMouseY;

        if (!dragState.hasMoved) {
          if (Math.abs(deltaX) <= DRAG_THRESHOLD && Math.abs(deltaY) <= DRAG_THRESHOLD) return;
          dragState.hasMoved = true;
          this._suppressNextClick = true;
        }

        const vw = getViewportWidth();
        const width = this.getCurrentWidth();
        const maxOffset = Math.max(0, vw - width);

        const newTop = Math.max(0, dragState.startTop + deltaY);
        dragState.curTop = newTop;
        this.element.style.top = `${newTop}px`;

        if (dragState.anchor === 'right') {
          const newRight = clamp(dragState.startOffset - deltaX, 0, maxOffset);
          dragState.curOffset = newRight;
          this.element.style.right = `${newRight}px`;
        } else {
          const newLeft = clamp(dragState.startOffset + deltaX, 0, maxOffset);
          dragState.curOffset = newLeft;
          this.element.style.left = `${newLeft}px`;
        }
      };

      const onMouseUp = () => {
        if (!dragState.isDragging) return;
        dragState.isDragging = false;
        document.body.removeEventListener('mousemove', onMouseMove);
        document.body.removeEventListener('mouseup', onMouseUp);

        if (dragState.hasMoved) {
          this.clampPosition();
          this.savePosition();
        }
      };

      header.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;

        const isCollapsed = this.element.classList.contains('toc-bar--collapsed');
        if (!isCollapsed && e.target.closest('.toc-bar__icon-btn')) return;

        const bbox = this.element.getBoundingClientRect();
        const vw = getViewportWidth();

        dragState.isDragging = true;
        dragState.hasMoved = false;
        dragState.startMouseX = e.pageX;
        dragState.startMouseY = e.pageY;
        dragState.startTop = bbox.y;
        dragState.anchor = this.anchor;

        if (this.anchor === 'right') {
          dragState.startOffset = vw - bbox.right;
        } else {
          dragState.startOffset = bbox.left;
        }

        document.body.addEventListener('mousemove', onMouseMove);
        document.body.addEventListener('mouseup', onMouseUp);
      });

      this.element.appendChild(header);
    },

    initTocbot(options) {
      const me = this;
      this._tocContentCountCache = {};

      const contentRoot = options.contentSelector ? document.querySelector(options.contentSelector) : null;
      const root = contentRoot || document.body;
      const headingSelector = options.headingSelector || 'h1, h2, h3, h4, h5';
      const headingCount = root.querySelectorAll(headingSelector).length;
      const dynamicCollapseDepth = headingCount > 80 ? 1 : headingCount > 40 ? 2 : 4;

      const tocbotOptions = Object.assign(
        {},
        {
          tocSelector: `.${TOCBOT_CONTAINTER_CLASS}`,
          scrollSmoothOffset: options.scrollSmoothOffset || 0,
          headingObjectCallback(obj, ele) {
            obj.textContent = obj.textContent.replace(/¶|#/g, '');
            if (!ele.id) {
              let newId;
              if (options.findHeaderId) newId = options.findHeaderId(ele);
              if (!newId) {
                newId = me.generateHeaderId(obj, ele);
                ele.setAttribute('id', newId);
              }
              if (newId) obj.id = newId;
            }
            return obj;
          },
          headingSelector,
          collapseDepth:
            typeof options.collapseDepth === 'number' ? options.collapseDepth : dynamicCollapseDepth,
        },
        options
      );

      try {
        tocbot.init(tocbotOptions);
        if (options.onInit) options.onInit(this);
      } catch (error) {
        console.warn('error in tocbot.init', error);
      }
    },

    generateHeaderId(obj) {
      const hash = doContentHash(obj.textContent);
      let count = 1;
      let resultHash = hash;

      if (this._tocContentCountCache[hash]) {
        count = this._tocContentCountCache[hash] + 1;
        resultHash = doContentHash(`${hash}-${count}`);
      }

      this._tocContentCountCache[hash] = count;
      return `tocbar-${resultHash}`;
    },

    // ✅ 关键改动：展开/收起都会先 chooseAnchorForToggle
    toggle(shouldShow = !this.visible, opts = {}) {
      const options = Object.assign({ persist: true, autoAnchor: true }, opts);
      const HIDDEN_CLASS = 'toc-bar--collapsed';

      const targetWidth = shouldShow ? TOC_BAR_WIDTH : TOC_BAR_COLLAPSED_WIDTH;

      if (options.autoAnchor) {
        // 展开时：用折叠态当前位置选锚点
        // 收起时：用展开态当前位置选锚点
        this.chooseAnchorForToggle(targetWidth);
      }

      if (shouldShow) {
        this.element.classList.remove(HIDDEN_CLASS);
        this.visible = true;
      } else {
        this.element.classList.add(HIDDEN_CLASS);
        this.visible = false;
      }

      this.clampPosition();
      if (options.persist) this.savePosition();
    },

    toggleScheme(isDark) {
      const isDarkMode = typeof isDark === 'undefined' ? !this.isDarkMode : isDark;
      this.element.setAttribute('colorscheme', isDarkMode ? 'dark' : 'light');
      this.isDarkMode = isDarkMode;

      GM_setValue(DARKMODE_KEY, isDarkMode);
      this.refreshStyle();
    },

    refreshStyle() {
      const themeColor = guessThemeColor();
      if (themeColor && !this.isDarkMode) {
        this.element.style.setProperty('--toc-bar-active-color', themeColor);
      } else {
        this.element.style.setProperty('--toc-bar-active-color', '#54BC4B');
      }
    },
  };

  // ---------- Theme Controller ----------
  const ThemeController = (() => {
    let mode = null;
    let currentBar = null;
    let mql = null;
    let intervalId = null;

    let menuInited = false;
    let menuCmdIds = [];

    function modeLabel(m) {
      switch (m) {
        case 'auto-system': return '跟随系统';
        case 'manual-light': return '手动亮色';
        case 'manual-dark': return '手动暗色';
        case 'auto-solar': return '按日出日落自动（经纬度）';
        default: return String(m);
      }
    }

    function degToRad(d) { return d * Math.PI / 180; }
    function radToDeg(r) { return r * 180 / Math.PI; }
    function normalizeDeg(d) {
      let r = d % 360;
      if (r < 0) r += 360;
      return r;
    }
    function dayOfYear(date) {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60000;
      return Math.floor(diff / 86400000);
    }

    function calcSunTime(date, lat, lng, isSunrise) {
      const zenith = 90.8333;
      const N = dayOfYear(date);
      const lngHour = lng / 15;
      const t = N + ((isSunrise ? 6 : 18) - lngHour) / 24;

      let M = 0.9856 * t - 3.289;
      let L = M + 1.916 * Math.sin(degToRad(M)) + 0.020 * Math.sin(2 * degToRad(M)) + 282.634;
      L = normalizeDeg(L);

      let RA = radToDeg(Math.atan(0.91764 * Math.tan(degToRad(L))));
      RA = normalizeDeg(RA);

      const Lquadrant = Math.floor(L / 90) * 90;
      const RAquadrant = Math.floor(RA / 90) * 90;
      RA = (RA + (Lquadrant - RAquadrant)) / 15;

      const sinDec = 0.39782 * Math.sin(degToRad(L));
      const cosDec = Math.cos(Math.asin(sinDec));

      const cosH =
        (Math.cos(degToRad(zenith)) - sinDec * Math.sin(degToRad(lat))) /
        (cosDec * Math.cos(degToRad(lat)));

      if (cosH > 1 || cosH < -1) return null;

      let H = isSunrise ? 360 - radToDeg(Math.acos(cosH)) : radToDeg(Math.acos(cosH));
      H = H / 15;

      const T = H + RA - 0.06571 * t - 6.622;
      let UT = T - lngHour;
      UT = (UT + 24) % 24;

      const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      return new Date(utcMidnight + UT * 3600 * 1000);
    }

    function getSolarConfig() {
      return GM_getValue(SOLAR_CONFIG_KEY, { lat: null, lng: null });
    }

    function getSystemDark() {
      return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    function isDarkBySolar(cfg) {
      if (!cfg || typeof cfg.lat !== 'number' || typeof cfg.lng !== 'number') return null;
      const now = new Date();
      const sunrise = calcSunTime(now, cfg.lat, cfg.lng, true);
      const sunset = calcSunTime(now, cfg.lat, cfg.lng, false);
      if (!sunrise || !sunset) return null;
      return now < sunrise || now >= sunset;
    }

    function applyTheme() {
      if (!currentBar) return;
      let dark = false;

      switch (mode) {
        case 'manual-dark':
          dark = true;
          break;
        case 'manual-light':
          dark = false;
          break;
        case 'auto-solar': {
          const bySolar = isDarkBySolar(getSolarConfig());
          dark = bySolar == null ? getSystemDark() : bySolar;
          break;
        }
        case 'auto-system':
        default:
          dark = getSystemDark();
      }

      currentBar.toggleScheme(dark);
    }

    function restartTimer() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (mode === 'auto-solar') {
        intervalId = setInterval(applyTheme, THEME_CHECK_INTERVAL);
      }
    }

    function ensureMode() {
      mode = GM_getValue(THEME_MODE_KEY, null);
      if (!mode) {
        const old = GM_getValue(DARKMODE_KEY, null);
        mode = old === null ? 'auto-system' : (old ? 'manual-dark' : 'manual-light');
        GM_setValue(THEME_MODE_KEY, mode);
      }
    }

    function initSystemListener() {
      if (!window.matchMedia) return;
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        if (mode === 'auto-system') applyTheme();
      };
      if (mql.addEventListener) mql.addEventListener('change', handler);
      else if (mql.addListener) mql.addListener(handler);
    }

    function clearMenu() {
      if (typeof GM_unregisterMenuCommand !== 'function') return false;
      menuCmdIds.forEach((id) => {
        try { GM_unregisterMenuCommand(id); } catch (e) {}
      });
      menuCmdIds = [];
      return true;
    }

    function registerMenu(label, handler) {
      const id = GM_registerMenuCommand(label, handler);
      menuCmdIds.push(id);
    }

    function renderMenu() {
      if (menuInited && typeof GM_unregisterMenuCommand !== 'function') return;
      if (menuInited) clearMenu();
      menuInited = true;

      const markTheme = (m) => (mode === m ? '✅ ' : '');
      const markOn = (enabled) => (enabled ? '✅ ' : '');

      registerMenu(`${markTheme('auto-system')}TOC主题：跟随系统`, () => setMode('auto-system', true));
      registerMenu(`${markTheme('manual-light')}TOC主题：手动亮色`, () => setMode('manual-light', true));
      registerMenu(`${markTheme('manual-dark')}TOC主题：手动暗色`, () => setMode('manual-dark', true));
      registerMenu(`${markTheme('auto-solar')}TOC主题：按日出日落自动（经纬度）`, () => setMode('auto-solar', true));

      registerMenu(
        `${markOn(InteractionSettings.getEscCollapseEnabled())}TOC交互：按 Esc 收起（默认关）`,
        () => {
          const next = !InteractionSettings.getEscCollapseEnabled();
          InteractionSettings.setEscCollapseEnabled(next);
          showToast(`Esc 收起：${next ? '已启用' : '已关闭'}`);
          renderMenu();
        }
      );

      registerMenu(
        `${markOn(InteractionSettings.getOutsideClickCollapseEnabled())}TOC交互：点击外部收起（默认关）`,
        () => {
          const next = !InteractionSettings.getOutsideClickCollapseEnabled();
          InteractionSettings.setOutsideClickCollapseEnabled(next);
          showToast(`外部点击收起：${next ? '已启用' : '已关闭'}`);
          renderMenu();
        }
      );

      registerMenu('⚙️ TOC主题：设置经纬度', () => {
        const old = getSolarConfig();
        const latStr = prompt('请输入纬度（-90 ~ 90）', old.lat ?? '');
        if (latStr == null) return;
        const lngStr = prompt('请输入经度（-180 ~ 180）', old.lng ?? '');
        if (lngStr == null) return;

        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          showToast('经纬度格式无效');
          return;
        }
        GM_setValue(SOLAR_CONFIG_KEY, { lat, lng });
        showToast(`已保存经纬度：${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        applyTheme();
      });
    }

    function setMode(nextMode, withFeedback = false) {
      const prev = mode;
      mode = nextMode;
      GM_setValue(THEME_MODE_KEY, mode);
      restartTimer();
      applyTheme();
      renderMenu();

      if (withFeedback) {
        const tip = prev === mode
          ? `TOC主题未变化：${modeLabel(mode)}`
          : `TOC主题已切换：${modeLabel(mode)}`;
        showToast(tip);
      }
    }

    function initMenu() {
      if (typeof GM_registerMenuCommand !== 'function') return;
      renderMenu();
    }

    return {
      init() {
        ensureMode();
        initSystemListener();
        initMenu();
        restartTimer();
      },
      attach(bar) {
        currentBar = bar;
        applyTheme();
      },
      detach(bar) {
        if (currentBar === bar) currentBar = null;
      },
      setMode,
      getMode() {
        return mode;
      },
    };
  })();

  // ---------- SPA / PJAX ----------
  function debounce(fn, wait = 120) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  let TOC_APP_INSTANCE = null;

  function destroyTocApp() {
    try { tocbot.destroy(); } catch (e) {}
    if (TOC_APP_INSTANCE && TOC_APP_INSTANCE.element && TOC_APP_INSTANCE.element.parentNode) {
      ThemeController.detach(TOC_APP_INSTANCE);
      TOC_APP_INSTANCE.element.remove();
    }
    TOC_APP_INSTANCE = null;
  }

  function mountTocApp() {
    const options = getPageTocOptions();
    if (!options) {
      destroyTocApp();
      return;
    }

    destroyTocApp();

    const tocBar = new TocBar(options);
    TOC_APP_INSTANCE = tocBar;
    tocBar.initTocbot(options);
    tocBar.refreshStyle();
    ThemeController.attach(tocBar);
  }

  function mountTocAppWithRetry(maxRetry = 8, baseDelay = 120) {
    let retry = 0;
    const run = () => {
      const options = getPageTocOptions();
      if (options) {
        mountTocApp();
        return;
      }
      retry += 1;
      if (retry <= maxRetry) {
        setTimeout(run, baseDelay * retry);
      } else {
        destroyTocApp();
      }
    };
    run();
  }

  function initSpaWatcher() {
    const schedule = debounce(() => mountTocAppWithRetry(), 100);

    document.addEventListener('turbo:load', schedule, true);
    document.addEventListener('pjax:end', schedule, true);
    window.addEventListener('popstate', schedule, true);

    ['pushState', 'replaceState'].forEach((key) => {
      const raw = history[key];
      if (typeof raw !== 'function') return;
      history[key] = function (...args) {
        const ret = raw.apply(this, args);
        window.dispatchEvent(new Event('tocbar:urlchange'));
        return ret;
      };
    });

    window.addEventListener('tocbar:urlchange', schedule, true);
  }

  function initGlobalInteractions() {
    // 可选：Esc 收起（默认关闭）
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape') return;
        if (!InteractionSettings.getEscCollapseEnabled()) return;
        if (!TOC_APP_INSTANCE || !TOC_APP_INSTANCE.visible) return;

        const t = e.target;
        const inEditable =
          t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (inEditable) return;

        TOC_APP_INSTANCE.collapseWithFeedback();
      },
      true
    );

    // 可选：点击外部收起（默认关闭）
    document.addEventListener(
      'mousedown',
      (e) => {
        if (!InteractionSettings.getOutsideClickCollapseEnabled()) return;
        if (!TOC_APP_INSTANCE || !TOC_APP_INSTANCE.visible) return;
        const root = TOC_APP_INSTANCE.element;
        if (!root) return;
        if (root.contains(e.target)) return;

        TOC_APP_INSTANCE.collapseWithFeedback();
      },
      true
    );

    // 窗口大小变化时，避免位置跑出屏幕
    window.addEventListener(
      'resize',
      debounce(() => {
        if (!TOC_APP_INSTANCE) return;
        TOC_APP_INSTANCE.clampPosition();
        TOC_APP_INSTANCE.savePosition();
      }, 120),
      true
    );
  }

  function main() {
    ThemeController.init();
    initSpaWatcher();
    initGlobalInteractions();
    mountTocAppWithRetry();
  }

  main();
})();
