// dsh-update-radar — 最小测试版本
window.__ModuleLoader__.load({
  id: 'dsh-update-radar',
  factory: function(require) {
    var module = { exports: {} };
    module.exports = {
      apply: function(ctx) {
        console.log('[dsh-update-radar] 插件已加载!');
      }
    };
    return module.exports;
  }
});
