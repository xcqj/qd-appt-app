#!/usr/bin/env node
/**
 * 品牌资产生成器（S12 · 规格唯一出处 app/DESIGN.md §12）
 *
 * 用法：cd app && pnpm brand:gen
 *
 * 设计要点：
 * - 三档 logo 由同一套几何常量派生（§12.2），不做多份手写 SVG 漂移；
 * - 挖空用 fill-rule="evenodd" 单路径，**不用 <mask>**（§12.1：多图内联 mask id 会重名互串）；
 * - favicon 用 PNG-in-ICO 手写拼装，不引额外依赖；光栅化只依赖 @resvg/resvg-js（预编译 napi）；
 * - 中文字标需要 CJK 字体：WSL 自带字体里没有，按候选路径找 Windows 侧微软雅黑；找不到就跳过字标 PNG 并提示。
 */
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Resvg } from '@resvg/resvg-js'

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ADMIN_ROOT = resolve(APP_ROOT, '../admin')

const COLOR = {
  primary: '#1F7A8C',
  primaryDark: '#16636F',
  accent: '#2A9D8F',
  inverse: '#FFFFFF',
  canvas: '#F5F7FA',
  tabIdle: '#8A94A6',
  tabActive: '#1F7A8C'
}

/** §12.1 母标几何（viewBox 64×64） */
const GEO = {
  box: 64,
  board: { x: 6, y: 10, w: 52, h: 44, r: 10 },
  cross: { arm: 24, width: 7.2, widthCompact: 8.4, r: 2.4, cx: 27.5, cy: 32 },
  dot: { r: 3.1, x: 45.5, ys: [23, 32, 41] }
}

/** 「号源」字标：系统字体、600 字重、字距 0（§12.3） */
const LOGO_TEXT = '号源'
const LOGO_FONT_STACK = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif'

const CJK_FONT_CANDIDATES = [
  '/mnt/c/Windows/Fonts/msyhbd.ttc',
  '/mnt/c/Windows/Fonts/msyh.ttc',
  '/mnt/c/Windows/Fonts/simhei.ttf',
  '/System/Library/Fonts/PingFang.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
]

const n = (v) => Number(v.toFixed(2))

function roundRectPath({ x, y, w, h, r }) {
  return (
    `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}` +
    `V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}` +
    `H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}` +
    `V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`
  )
}

function crossPath(width) {
  const { arm, r, cx, cy } = GEO.cross
  const hw = width / 2
  const half = arm / 2
  const vertical =
    `M${n(cx - hw + r)} ${n(cy - half)}H${n(cx + hw - r)}A${n(r)} ${n(r)} 0 0 1 ${n(cx + hw)} ${n(cy - half + r)}` +
    `V${n(cy + half - r)}A${n(r)} ${n(r)} 0 0 1 ${n(cx + hw - r)} ${n(cy + half)}` +
    `H${n(cx - hw + r)}A${n(r)} ${n(r)} 0 0 1 ${n(cx - hw)} ${n(cy + half - r)}` +
    `V${n(cy - half + r)}A${n(r)} ${n(r)} 0 0 1 ${n(cx - hw + r)} ${n(cy - half)}Z`
  const horizontal =
    `M${n(cx - half + r)} ${n(cy - hw)}H${n(cx + half - r)}A${n(r)} ${n(r)} 0 0 1 ${n(cx + half)} ${n(cy - hw + r)}` +
    `V${n(cy + hw - r)}A${n(r)} ${n(r)} 0 0 1 ${n(cx + half - r)} ${n(cy + hw)}` +
    `H${n(cx - half + r)}A${n(r)} ${n(r)} 0 0 1 ${n(cx - half)} ${n(cy + hw - r)}` +
    `V${n(cy - hw + r)}A${n(r)} ${n(r)} 0 0 1 ${n(cx - half + r)} ${n(cy - hw)}Z`
  return vertical + horizontal
}

/** 纯十字档的紧致画布：十字包围盒 + 8% 安全区（按牌宽 52 计算） */
const CROSS_VIEWBOX = (() => {
  const pad = GEO.board.w * 0.08
  const half = GEO.cross.arm / 2
  const size = GEO.cross.arm + pad * 2
  return `${n(GEO.cross.cx - half - pad)} ${n(GEO.cross.cy - half - pad)} ${n(size)} ${n(size)}`
})()

/** 圆点也写成路径子形状（evenodd 负形）：独立 <circle> 与牌同色会看不见（2026-10-24 修） */
function circlePath(cx, cy, r) {
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}Z`
}

function dotsPath() {
  return GEO.dot.ys.map((cy) => circlePath(GEO.dot.x, cy, GEO.dot.r)).join('')
}

/** 三档图形（§12.2 / 尺寸→档位映射表） */
function markInner(tier, color) {
  if (tier === 'crossOnly') {
    return `<path fill="${color}" fill-rule="evenodd" d="${crossPath(GEO.cross.width)}"/>`
  }
  const board = roundRectPath(GEO.board)
  if (tier === 'compact') {
    return `<path fill="${color}" fill-rule="evenodd" d="${board}${crossPath(GEO.cross.widthCompact)}"/>`
  }
  return `<path fill="${color}" fill-rule="evenodd" d="${board}${crossPath(GEO.cross.width)}${dotsPath()}"/>`
}

function markSvg(tier, color, size) {
  const viewBox = tier === 'crossOnly' ? CROSS_VIEWBOX : `0 0 ${GEO.box} ${GEO.box}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}">${markInner(tier, color)}</svg>`
}

/** 横版组合：图形 + 「号源」字标 */
function horizontalSvg(color) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 186 64" width="186" height="64">` +
    markInner('full', color) +
    `<text x="76" y="45" font-family='${LOGO_FONT_STACK}' font-size="42" font-weight="600" letter-spacing="0" fill="${color}">${LOGO_TEXT}</text>` +
    `</svg>`
  )
}

function coverSvg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`
}

function squareCover() {
  const bg = `<rect width="144" height="144" fill="${COLOR.canvas}"/>`
  const mark = `<g transform="translate(24 24) scale(1.5)">${markInner('full', COLOR.primary)}</g>`
  return coverSvg(144, 144, bg + mark)
}

function bannerCover(hasCjk) {
  const grad =
    `<defs><linearGradient id="brand-banner" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${COLOR.primary}"/><stop offset="1" stop-color="${COLOR.accent}"/>` +
    `</linearGradient></defs><rect width="520" height="280" fill="url(#brand-banner)"/>`
  const markGroup = `<g transform="translate(196 96) scale(1.05)">${markInner('full', COLOR.inverse)}</g>`
  const label = hasCjk
    ? `<text x="260" y="196" text-anchor="middle" font-family='${LOGO_FONT_STACK}' font-size="34" font-weight="600" fill="${COLOR.inverse}">${LOGO_TEXT}</text>`
    : ''
  return coverSvg(520, 280, grad + markGroup + label)
}

/** tabBar 四项（§12.5：24 网格 / stroke 2 / 圆头圆角） */
const TABBAR_ICONS = {
  home: 'M3.6 10.4 12 3.8l8.4 6.6V19a1.4 1.4 0 0 1-1.4 1.4H5a1.4 1.4 0 0 1-1.4-1.4z M9.6 20.4v-5.2h4.8v5.2',
  booking:
    'M4.4 6.6A2.2 2.2 0 0 1 6.6 4.4h10.8a2.2 2.2 0 0 1 2.2 2.2v11a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2z' +
    ' M8 2.8v3.4 M16 2.8v3.4 M4.4 9.6h15.2 M8.8 14.2l2.4 2.4 4-4',
  notice:
    'M5.8 4.6h12.4a2.4 2.4 0 0 1 2.4 2.4v7a2.4 2.4 0 0 1-2.4 2.4h-5.6l-3.6 3v-3H5.8a2.4 2.4 0 0 1-2.4-2.4v-7a2.4 2.4 0 0 1 2.4-2.4z' +
    ' M8.2 8.8h7.6 M8.2 12.2h4.8',
  mine: 'M12 4.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z M4.8 20.2c0-3.7 3.2-6.2 7.2-6.2s7.2 2.5 7.2 6.2'
}

function tabbarSvg(pathData, color) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="81" height="81">` +
    `<g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${pathData}"/></g></svg>`
  )
}

/** 分诊台自绘底栏三项（同一套 24 网格 / stroke 2 / 圆头规则，§12.5） */
const TRIAGE_ICONS = {
  sign:
    'M4 9V6.6A2.6 2.6 0 0 1 6.6 4H9 M15 4h2.4A2.6 2.6 0 0 1 20 6.6V9' +
    ' M20 15v2.4a2.6 2.6 0 0 1-2.6 2.6H15 M9 20H6.6A2.6 2.6 0 0 1 4 17.4V15 M7.6 12h8.8',
  list: 'M8.6 6.8h10.6 M8.6 12h10.6 M8.6 17.2h7 M4.9 6.8h.01 M4.9 12h.01 M4.9 17.2h.01',
  suspend:
    'M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8z M10.2 9.4v5.2 M13.8 9.4v5.2'
}

function findCjkFont() {
  return CJK_FONT_CANDIDATES.find((file) => existsSync(file)) ?? null
}

function rasterize(svg, width, cjkFont) {
  const font = cjkFont
    ? { fontFiles: [cjkFont], loadSystemFonts: false, defaultFontFamily: 'Microsoft YaHei' }
    : { loadSystemFonts: true }
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, font }).render().asPng()
}

/** PNG-in-ICO：6 字节头 + N×16 字节目录 + PNG 载荷 */
function packIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  let offset = 6 + entries.length * 16
  const dirs = entries.map(({ size, png }) => {
    const dir = Buffer.alloc(16)
    dir.writeUInt8(size >= 256 ? 0 : size, 0)
    dir.writeUInt8(size >= 256 ? 0 : size, 1)
    dir.writeUInt8(0, 2)
    dir.writeUInt8(0, 3)
    dir.writeUInt16LE(1, 4)
    dir.writeUInt16LE(32, 6)
    dir.writeUInt32LE(png.length, 8)
    dir.writeUInt32LE(offset, 12)
    offset += png.length
    return dir
  })
  return Buffer.concat([header, ...dirs, ...entries.map((entry) => entry.png)])
}

async function write(target, data) {
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, data)
  const size = typeof data === 'string' ? Buffer.byteLength(data) : data.length
  console.log(`  ✓ ${target.replace(`${APP_ROOT}/`, 'app/').replace(`${ADMIN_ROOT}/`, 'admin/')} (${size} B)`)
}

async function main() {
  const brandDir = join(APP_ROOT, 'src/static/brand')
  const tabbarDir = join(APP_ROOT, 'src/static/tabbar')
  const cjkFont = findCjkFont()
  const hasAdmin = existsSync(ADMIN_ROOT)

  console.log('品牌资产（DESIGN §12）')
  if (!cjkFont) {
    console.warn('  ! 未找到中文字体，跳过「号源」字标 PNG 与横版封面文字（SVG 仍会输出）')
  }

  // 1. 母标 SVG（§12.3）
  await write(join(brandDir, 'logo-full-primary.svg'), markSvg('full', COLOR.primary, 64))
  await write(join(brandDir, 'logo-compact-primary.svg'), markSvg('compact', COLOR.primary, 40))
  await write(join(brandDir, 'logo-cross-primary.svg'), markSvg('crossOnly', COLOR.primary, 32))
  await write(join(brandDir, 'logo-full-inverse.svg'), markSvg('full', COLOR.inverse, 64))
  await write(join(brandDir, 'logo-horizontal.svg'), horizontalSvg(COLOR.primary))

  // 2. PNG 主色档（16/32 纯十字，48 起完整，§12.2 映射表）
  for (const size of [16, 32, 48, 64, 128, 256, 512]) {
    const tier = size <= 32 ? 'crossOnly' : 'full'
    await write(join(brandDir, `logo-${size}.png`), rasterize(markSvg(tier, COLOR.primary, size), size))
  }

  // 3. 反白档
  for (const size of [48, 64, 128, 512]) {
    await write(join(brandDir, `logo-inverse-${size}.png`), rasterize(markSvg('full', COLOR.inverse, size), size))
  }

  // 3b. 简化档 PNG（24–48px 显示用：移动端页头、消息占位）
  await write(join(brandDir, 'logo-compact-48.png'), rasterize(markSvg('compact', COLOR.primary, 48), 48))
  await write(join(brandDir, 'logo-compact-inverse-48.png'), rasterize(markSvg('compact', COLOR.inverse, 48), 48))

  // 4. 横版组合与封面
  const horizontal = horizontalSvg(COLOR.primary)
  if (cjkFont) {
    await write(join(brandDir, 'logo-horizontal-512.png'), rasterize(horizontal, 512, cjkFont))
  }
  await write(join(brandDir, 'cover-144.png'), rasterize(squareCover(), 144))
  await write(
    join(brandDir, 'cover-520x280.png'),
    rasterize(bannerCover(Boolean(cjkFont)), 520, cjkFont ?? undefined)
  )

  // 5. favicon（16/32/48 内嵌）
  const icoEntries = [
    { size: 16, png: rasterize(markSvg('crossOnly', COLOR.primary, 16), 16) },
    { size: 32, png: rasterize(markSvg('crossOnly', COLOR.primary, 32), 32) },
    { size: 48, png: rasterize(markSvg('full', COLOR.primary, 48), 48) }
  ]
  const ico = packIco(icoEntries)
  await write(join(brandDir, 'favicon.ico'), ico)

  // 6. 兼容既有引用的 app/src/static/logo.png
  await write(join(APP_ROOT, 'src/static/logo.png'), rasterize(markSvg('full', COLOR.primary, 64), 64))

  // 7. tabBar 8 张（§12.5）+ 分诊台自绘底栏 6 张
  for (const name of Object.keys(TABBAR_ICONS)) {
    await write(join(tabbarDir, `${name}.png`), rasterize(tabbarSvg(TABBAR_ICONS[name], COLOR.tabIdle), 81))
    await write(join(tabbarDir, `${name}-active.png`), rasterize(tabbarSvg(TABBAR_ICONS[name], COLOR.tabActive), 81))
  }
  for (const name of Object.keys(TRIAGE_ICONS)) {
    await write(join(tabbarDir, `triage-${name}.png`), rasterize(tabbarSvg(TRIAGE_ICONS[name], COLOR.tabIdle), 81))
    await write(join(tabbarDir, `triage-${name}-active.png`), rasterize(tabbarSvg(TRIAGE_ICONS[name], COLOR.tabActive), 81))
  }

  // 8. admin 侧（不存在则跳过，不中断）
  if (hasAdmin) {
    await write(join(ADMIN_ROOT, 'src/assets/logo/logo.png'), rasterize(markSvg('full', COLOR.primary, 128), 128))
    await write(join(ADMIN_ROOT, 'src/assets/logo/logo-white.png'), rasterize(markSvg('full', COLOR.inverse, 128), 128))
    // 顶栏 / 侧栏按 28–32px 显示，走 24–48 简化档（§12.2 尺寸映射）
    await write(join(ADMIN_ROOT, 'src/assets/logo/logo-compact.png'), rasterize(markSvg('compact', COLOR.primary, 48), 48))
    await write(join(ADMIN_ROOT, 'src/assets/logo/logo-compact-white.png'), rasterize(markSvg('compact', COLOR.inverse, 48), 48))
    await write(join(ADMIN_ROOT, 'public/favicon.ico'), ico)
  } else {
    console.warn('  ! 未找到 ../admin，跳过后台侧产物')
  }

  console.log('完成。')
}

await main()
