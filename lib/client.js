// dsh-update-radar — Client half
// 使用 DSH 的 lazy-CJS 模块格式（参考 dsh-bg-changer）

window.__ModuleLoader__.load({
  id: 'dsh-update-radar',
  factory: function(require) {
    var module = { exports: {} };
    var exports = module.exports;

    var React = require('react');

    // ============ 配置 ============
    var GITHUB_REPO = 'deepseek-ai/deepseek-harness';
    var CURRENT_VERSION = '0.1.6-alpha.1';
    var CHECK_INTERVAL_MS = 30 * 60 * 1000;
    var CACHE_KEY = 'dsh-update-radar-cache';
    var CACHE_TTL_MS = 30 * 60 * 1000;

    // ============ semver 比较 ============
    function parseVersion(v) {
      if (!v) return null;
      var m = v.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
      if (!m) return null;
      return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10), patch: parseInt(m[3], 10), pre: m[4] || '' };
    }

    function compareVersions(a, b) {
      var pa = parseVersion(a);
      var pb = parseVersion(b);
      if (!pa || !pb) return a === b ? 0 : (a < b ? -1 : 1);
      if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
      if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
      if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
      if (!pa.pre && !pb.pre) return 0;
      if (!pa.pre) return 1;
      if (!pb.pre) return -1;
      return pa.pre < pb.pre ? -1 : (pa.pre > pb.pre ? 1 : 0);
    }

    // ============ 缓存 ============
    function getCached() {
      try {
        var raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (Date.now() - data.ts > CACHE_TTL_MS) return null;
        return data;
      } catch (e) { return null; }
    }

    function setCache(ver) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ v: ver, ts: Date.now() })); } catch (e) {}
    }

    // ============ 获取最新 tag ============
    function fetchLatestTag(callback) {
      var cached = getCached();
      if (cached) {
        callback(cached.v);
        return;
      }
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://api.github.com/repos/' + GITHUB_REPO + '/tags?per_page=5');
      xhr.setRequestHeader('User-Agent', 'dsh-update-radar/0.1.0');
      xhr.timeout = 15000;
      xhr.onload = function() {
        try {
          var tags = JSON.parse(xhr.responseText);
          if (Array.isArray(tags) && tags.length > 0) {
            var latest = tags[0].name;
            setCache(latest);
            callback(latest);
          } else {
            callback(null);
          }
        } catch (e) { callback(null); }
      };
      xhr.onerror = function() { callback(null); };
      xhr.ontimeout = function() { callback(null); };
      xhr.send();
    }

    // ============ React 组件 ============
    function UpdateRadarBadge() {
      var _s = React.useState(null);
      var latest = _s[0];
      var setLatest = _s[1];

      var _loading = React.useState(true);
      var loading = _loading[0];
      var setLoading = _loading[1];

      React.useEffect(function() {
        var cancelled = false;
        function check() {
          fetchLatestTag(function(ver) {
            if (!cancelled) {
              if (ver && compareVersions(CURRENT_VERSION, ver) < 0) {
                setLatest(ver);
              }
              setLoading(false);
            }
          });
        }
        check();
        var timer = setInterval(function() { if (!cancelled) check(); }, CHECK_INTERVAL_MS);
        return function() { cancelled = true; clearInterval(timer); };
      }, []);

      if (loading || !latest) return null;

      return React.createElement('a', {
        className: 'dsh-radar-badge',
        href: 'https://github.com/deepseek-ai/deepseek-harness/tags',
        target: '_blank',
        rel: 'noopener noreferrer',
        title: '新版本 ' + latest + ' 可用，点击查看'
      },
        React.createElement('span', { className: 'dsh-radar-dot' }),
        React.createElement('span', null, latest)
      );
    }

    // ============ Cordis 插件 ============
    module.exports = {
      apply: function(ctx) {
        var slots = ctx.get('slots');
        if (!slots) return;

        // 样式注入
        var styleEl = document.createElement('style');
        styleEl.setAttribute('data-plugin', 'dsh-update-radar');
        styleEl.textContent = '.dsh-radar-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:500;color:#3b82f6;cursor:pointer;transition:background 0.15s;white-space:nowrap;text-decoration:none}.dsh-radar-badge:hover{background:rgba(59,130,246,0.1)}.dsh-radar-badge:active{background:rgba(59,130,246,0.2)}.dsh-radar-dot{width:6px;height:6px;border-radius:50%;background:#3b82f6;animation:dsh-radar-pulse 2s infinite}@keyframes dsh-radar-pulse{0%,100%{opacity:1}50%{opacity:0.4}}';
        document.head.appendChild(styleEl);

        // 注册到 sidebar.panellist
        slots.inject('sidebar.panellist', function() {
          return slots.register(
            { name: 'sidebar.panellist', id: 'update-radar', order: -1, label: '更新雷达' },
            function() { return React.createElement(UpdateRadarBadge); }
          );
        });

        // 清理
        ctx.effect(function() {
          return function() {
            if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
          };
        });
      }
    };

    return module.exports;
  }
});
