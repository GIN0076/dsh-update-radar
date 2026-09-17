#!/usr/bin/env node
/**
 * dsh-update-radar 安装/卸载脚本
 *
 * 用法：
 *   node tools/install.cjs              # 安装（link 到 profile）
 *   node tools/install.cjs --uninstall  # 卸载
 *   node tools/install.cjs --dry-run    # 预览操作
 *
 * 注意事项（参考踩坑记录）：
 * - 坑 #2：写 ~/.dsh 需要足够权限
 * - 坑 #14：不要同时写 bundles 和 cordis.patch.yml，只用 cordis.patch.yml 的 insert
 * - 坑 #25：dsh plugin CLI 对含空格路径处理有问题，这里用 pnpm add link: 直接操作
 * - 坑 #28：改完 profile 必须重启服务
 */

var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

// ============ 配置 ============
var PLUGIN_NAME = 'dsh-update-radar';
var DSH_HOME = process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME, '.dsh');
var PROFILE_DIR = path.join(DSH_HOME, 'profiles', 'web');
var PROFILE_PKG = path.join(PROFILE_DIR, 'package.json');
var PLUGIN_DIR = path.resolve(__dirname, '..');

// ============ 工具函数 ============
function log(msg) { console.log('[update-radar] ' + msg); }
function warn(msg) { console.warn('[update-radar] ⚠️ ' + msg); }
function error(msg) { console.error('[update-radar] ❌ ' + msg); }

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function runPnpm(args, cwd) {
  try {
    var result = child_process.spawnSync('pnpm', args, {
      cwd: cwd || PROFILE_DIR,
      stdio: 'pipe',
      shell: true,
      env: Object.assign({}, process.env)
    });
    return { exitCode: result.status, stdout: (result.stdout || '').toString(), stderr: (result.stderr || '').toString() };
  } catch (e) {
    return { exitCode: -1, stdout: '', stderr: e.message };
  }
}

// ============ 安装 ============
function install() {
  log('开始安装...');

  // 检查 profile 目录
  if (!fs.existsSync(PROFILE_DIR)) {
    error('Profile 目录不存在: ' + PROFILE_DIR);
    error('请先确认 DSH 已正确安装');
    process.exit(1);
  }

  // 检查 plugin 目录
  if (!fs.existsSync(path.join(PLUGIN_DIR, 'lib', 'client.js'))) {
    error('插件文件不完整: 缺少 lib/client.js');
    process.exit(1);
  }

  // 读取 profile package.json
  var pkg = readJson(PROFILE_PKG);
  if (!pkg) {
    error('无法读取 profile package.json: ' + PROFILE_PKG);
    process.exit(1);
  }

  // 检查是否已安装
  var deps = pkg.dependencies || {};
  if (deps[PLUGIN_NAME]) {
    log('插件已安装，更新中...');
  }

  // Step 1: pnpm add link:<plugin_dir>
  log('Step 1: 链接插件到 profile...');
  var linkResult = runPnpm(['add', 'link:' + PLUGIN_DIR]);
  if (linkResult.exitCode !== 0) {
    warn('pnpm add 输出: ' + linkResult.stderr || linkResult.stdout);
    // link: 可能已经存在，检查一下
    if (!linkResult.stderr || linkResult.stderr.includes('already')) {
      log('链接已存在，继续...');
    } else {
      error('pnpm add link 失败');
      error('stderr: ' + linkResult.stderr);
      process.exit(1);
    }
  }
  log('Step 1 完成 ✓');

  // Step 2: 添加到 dsh.profile.bundles（插件自己的 cordis.patch.yml 通过 dsh.bundle.patch 自动注册）
  log('Step 2: 添加到 dsh.profile.bundles...');
  var dshConfig = pkg.dsh || {};
  var profileConfig = dshConfig.profile || {};
  var bundles = profileConfig.bundles || [];

  if (bundles.indexOf(PLUGIN_NAME) !== -1) {
    log('已在 bundles 中，跳过');
  } else {
    bundles.push(PLUGIN_NAME);
    profileConfig.bundles = bundles;
    dshConfig.profile = profileConfig;
    pkg.dsh = dshConfig;
    writeJson(PROFILE_PKG, pkg);
    log('Step 2 完成 ✓');
  }

  // 完成
  log('');
  log('✅ 安装完成！');
  log('');
  log('请执行以下步骤使插件生效：');
  log('  1. 重启 DSH 服务（托盘图标右键 → 重新启动服务）');
  log('  2. 刷新浏览器页面（Ctrl+Shift+R）');
  log('  3. 查看侧边栏顶部是否出现蓝色更新提示');
  log('');
  log('如果有新版本，会显示类似 "🔄 v0.1.7-alpha.1" 的蓝色文字');
  log('点击可跳转到 GitHub tags 页面下载新版本');
}

// ============ 卸载 ============
function uninstall() {
  log('开始卸载...');

  // 读取 profile package.json
  var pkg = readJson(PROFILE_PKG);
  if (!pkg) {
    error('无法读取 profile package.json');
    process.exit(1);
  }

  // Step 1: pnpm remove
  log('Step 1: 从 profile 移除...');
  var removeResult = runPnpm(['remove', PLUGIN_NAME]);
  if (removeResult.exitCode !== 0) {
    warn('pnpm remove 输出: ' + removeResult.stderr);
  }
  log('Step 1 完成 ✓');

  // Step 2: 从 dsh.profile.bundles 移除
  log('Step 2: 从 dsh.profile.bundles 移除...');
  var dshConfig = pkg.dsh || {};
  var profileConfig = dshConfig.profile || {};
  var bundles = profileConfig.bundles || [];
  var idx = bundles.indexOf(PLUGIN_NAME);
  if (idx !== -1) {
    bundles.splice(idx, 1);
    profileConfig.bundles = bundles;
    dshConfig.profile = profileConfig;
    pkg.dsh = dshConfig;
    writeJson(PROFILE_PKG, pkg);
    log('Step 2 完成 ✓');
  } else {
    log('不在 bundles 中，跳过');
  }

  // 清理缓存
  log('清理浏览器缓存...');
  log('（请在浏览器控制台执行: localStorage.removeItem("dsh-update-radar-cache")）');

  log('');
  log('✅ 卸载完成！');
  log('请重启 DSH 服务使更改生效');
}

// ============ 主入口 ============
var args = process.argv.slice(2);
if (args.includes('--uninstall')) {
  uninstall();
} else if (args.includes('--dry-run')) {
  log('预览模式（不执行实际操作）');
  log('Profile 目录: ' + PROFILE_DIR);
  log('插件目录: ' + PLUGIN_DIR);
  log('将执行: pnpm add link:' + PLUGIN_DIR);
  log('将修改: cordis.patch.yml 添加 insert 行');
} else {
  install();
}
