/**
 * 四态收敛（加载 / 空 / 错误 / 正常）——九屏共用
 *
 * 只负责「一次异步读取」的状态，不掺业务分支：
 * - 并发单飞：后发的请求胜出，先发的回包直接丢弃（切日期 / 切 tab 时避免状态错乱）
 * - 错误文案统一走 `bizMessage()`（DESIGN §8.2 唯一映射）
 * - 空态由调用方传入 `looksEmpty`（列表看长度、详情看 null），避免把「0 条」当错误
 */
import type { Ref } from 'vue'
import { ref } from 'vue'

import { bizMessage } from '@/utils/appt'

export interface AsyncDataState<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string>
  isEmpty: Ref<boolean>
  run: () => Promise<T | null>
}

export function useAsyncData<T>(
  loader: () => Promise<T>,
  looksEmpty?: (data: T) => boolean,
): AsyncDataState<T> {
  const data = ref(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref('')
  const empty = ref(false)
  let seq = 0

  async function run(): Promise<T | null> {
    const current = ++seq
    loading.value = true
    error.value = ''
    try {
      const result = await loader()
      if (current !== seq) {
        return result
      }
      data.value = result
      empty.value = looksEmpty ? looksEmpty(result) : result == null
      return result
    } catch (e) {
      if (current === seq) {
        data.value = null
        empty.value = false
        error.value = bizMessage(e)
      }
      return null
    } finally {
      if (current === seq) {
        loading.value = false
      }
    }
  }

  return { data, loading, error, isEmpty: empty, run }
}
