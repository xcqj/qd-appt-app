/**
 * Wot UI 2.x 组件解析器（供 @uni-helper/vite-plugin-uni-components 使用）
 *
 * 组件按源码发布：`@wot-ui/ui/components/wd-button/wd-button.vue`，
 * 模板里写 `<wd-button />` 即可，无需 import。
 *
 * 注意：只匹配 `Wd[A-Z]` 前缀，避免误吞 `<w-xxx>` 之类的业务组件。
 */
const PASCAL = /([a-z0-9])([A-Z])/g

function toKebab(name: string): string {
  return name.replace(PASCAL, '$1-$2').toLowerCase()
}

export interface ResolvedComponent {
  name: string
  from: string
}

export function WotResolver() {
  return {
    type: 'component' as const,
    resolve(name: string): ResolvedComponent | undefined {
      if (!/^Wd[A-Z]/.test(name)) {
        return undefined
      }
      const kebab = toKebab(name)
      return { name, from: `@wot-ui/ui/components/${kebab}/${kebab}.vue` }
    },
  }
}
