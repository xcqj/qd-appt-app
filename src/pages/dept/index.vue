<script setup lang="ts">
/**
 * 9.3 选科室（DESIGN §9.3）
 *
 * 字段：A2 `deptId / parentId / name / level / children`（按院区过滤、无出诊人员的枝已剪掉）。
 * 交互：左侧一级栏 + 右侧子级列表，逐层下钻；叶子节点直接进医生列表；顶部搜索跳过层级。
 */
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { DeptTreeVo } from '@/api/appt/types'
import { getDeptTree } from '@/api/appt/public'
import PageState from '@/components/PageState.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateBack, navigateTo, ROUTES } from '@/router/routes'
import { useBookingStore } from '@/store/booking'

const booking = useBookingStore()

const rootIndex = ref(0)
const path = ref<DeptTreeVo[]>([])
const keyword = ref('')
const pendingRootId = ref('')

/** 换院区后必须重新拉树，所以 loader 每次调用都读 store 当前院区 */
const { data: tree, loading, error, isEmpty, run } = useAsyncData<DeptTreeVo[]>(
  () => getDeptTree(booking.campusId),
  (list) => list.length === 0,
)

const roots = computed<DeptTreeVo[]>(() => tree.value ?? [])

const activeRoot = computed<DeptTreeVo | null>(() => roots.value[rootIndex.value] ?? null)

/** 右侧当前层：下钻栈顶的子级；一级无子级时直接把自己当叶子 */
const currentList = computed<DeptTreeVo[]>(() => {
  const top = path.value.length ? path.value[path.value.length - 1] : activeRoot.value
  if (!top) {
    return []
  }
  return top.children && top.children.length ? top.children : [top]
})

const breadcrumb = computed(() => [activeRoot.value?.name ?? '', ...path.value.map((item) => item.name)].filter(Boolean))

function flatten(nodes: DeptTreeVo[], acc: DeptTreeVo[] = []): DeptTreeVo[] {
  nodes.forEach((node) => {
    if (node.children && node.children.length) {
      flatten(node.children, acc)
      return
    }
    acc.push(node)
  })
  return acc
}

/** 搜索只在叶子层匹配（科室名），避免出现点进去还得再选一次 */
const searchResult = computed<DeptTreeVo[]>(() => {
  const text = keyword.value.trim()
  if (!text) {
    return []
  }
  return flatten(roots.value).filter((item) => item.name.includes(text))
})

const listData = computed<DeptTreeVo[]>(() => (keyword.value.trim() ? searchResult.value : currentList.value))

function selectRoot(index: number): void {
  rootIndex.value = index
  path.value = []
  keyword.value = ''
}

function enter(node: DeptTreeVo): void {
  if (node.children && node.children.length) {
    path.value = [...path.value, node]
    return
  }
  openDoctors(node)
}

function backTo(index: number): void {
  path.value = path.value.slice(0, index)
}

function openDoctors(node: DeptTreeVo): void {
  booking.setDept({ deptId: node.deptId, name: node.name })
  navigateTo(ROUTES.doctorList, { deptId: node.deptId })
}

function goCampus(): void {
  navigateTo(ROUTES.campus)
}

onLoad((query) => {
  pendingRootId.value = (query?.rootId as string) ?? ''
})

onShow(() => {
  if (!booking.restoreLastCampus()) {
    return
  }
  void run().then(() => {
    if (!pendingRootId.value) {
      return
    }
    const index = roots.value.findIndex((item) => item.deptId === pendingRootId.value)
    if (index >= 0) {
      rootIndex.value = index
    }
    pendingRootId.value = ''
  })
})
</script>

<template>
  <view class="appt-page dept">
    <view v-if="!booking.hasCampus" class="appt-content dept__body">
      <PageState :empty="true" empty-text="未选择院区" empty-desc="请先选择就诊院区">
        <template #empty-action>
          <wd-button size="small" type="primary" @click="goCampus">去选择院区</wd-button>
        </template>
      </PageState>
    </view>

    <template v-else>
      <view class="dept__search">
        <wd-search v-model="keyword" placeholder="搜索科室" hide-cancel />
      </view>

      <PageState
        :loading="loading"
        :error="error"
        :empty="isEmpty || listData.length === 0"
        :empty-text="keyword ? '没有匹配的科室' : '该院区暂未开放科室'"
        :empty-desc="keyword ? '请更换关键词后重试' : '请选择其他院区，或稍后重试'"
        :rows="5"
        @retry="run"
      >
        <view class="dept__split">
          <scroll-view class="dept__side" scroll-y>
            <view
              v-for="(root, index) in roots"
              :key="root.deptId"
              class="dept__side-item"
              :class="{ 'dept__side-item--active': index === rootIndex && !keyword }"
              @click="selectRoot(index)"
            >
              {{ root.name }}
            </view>
          </scroll-view>

          <scroll-view class="dept__main" scroll-y>
            <view v-if="breadcrumb.length > 1" class="dept__crumb">
              <text class="appt-link" @click="backTo(0)">{{ breadcrumb[0] }}</text>
              <text class="appt-weak"> / </text>
              <text class="appt-weak">{{ breadcrumb.slice(1).join(' / ') }}</text>
            </view>

            <view
              v-for="node in listData"
              :key="node.deptId"
              class="dept__row appt-press"
              @click="enter(node)"
            >
              <text class="dept__row-name">{{ node.name }}</text>
              <text class="dept__row-arrow">{{ node.children && node.children.length ? '›' : '进入' }}</text>
            </view>
          </scroll-view>
        </view>
      </PageState>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.dept {
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  &__body {
    padding-top: 32rpx;
  }

  &__search {
    padding: 16rpx 32rpx;
    background-color: var(--appt-surface);
  }

  &__split {
    display: flex;
    height: calc(100vh - 120rpx);
  }

  &__side {
    flex: none;
    width: 180rpx;
    height: 100%;
    background-color: var(--appt-surface-weak);
  }

  &__side-item {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: 96rpx;
    padding: 0 20rpx;
    border-left: 4rpx solid transparent;
    font-size: 28rpx;
    color: var(--appt-text-sub);

    &--active {
      border-left-color: var(--appt-primary);
      background-color: var(--appt-surface);
      font-weight: 600;
      color: var(--appt-primary);
    }
  }

  &__main {
    flex: 1;
    height: 100%;
    background-color: var(--appt-surface);
  }

  &__crumb {
    padding: 20rpx 24rpx 0;
    font-size: 24rpx;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 96rpx;
    margin: 0 24rpx;
    padding: 16rpx 0;
    border-bottom: 1rpx solid var(--appt-line);

    &:last-child {
      border-bottom: none;
    }
  }

  &__row-name {
    font-size: 28rpx;
    color: var(--appt-text);
  }

  &__row-arrow {
    font-size: 24rpx;
    color: var(--appt-text-weak);
  }
}
</style>
