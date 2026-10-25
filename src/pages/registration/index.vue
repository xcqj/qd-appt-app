<script setup lang="ts">
/**
 * 9.9 我的预约（DESIGN §9.9）
 *
 * 字段：B2 `registrationId / registrationNo / patientName / staffName / deptName / campusName /
 *       visitDate / period / timePoint / status / fee`。
 * tab：待支付 / 已预约 / 已完成 / 退号·爽约（第四项内再给三个子筛选）——B2 `status` 必填，一次只查一个状态，
 *       **没有「全部」tab**。
 * 动作（S10 收窄）：仅 WAIT_PAY 给「去支付 / 取消」；`paymentNo` 需先调 B3 取 `payment.paymentNo`（不渲染详情页）。
 */
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { PaymentBriefVo, RegistrationRowVo } from '@/api/appt/types'
import { cancelUnpaidPayment, getRegistrationDetail, listRegistrations } from '@/api/appt/patient'
import PageState from '@/components/PageState.vue'
import StatusTag from '@/components/StatusTag.vue'
import { navigateTo, ROUTES, switchTab } from '@/router/routes'
import { useBookingStore } from '@/store/booking'
import { useUserStore } from '@/store/user'
import { bizMessage, formatVisitDate, periodLabel, timePointText } from '@/utils/appt'

const userStore = useUserStore()
const booking = useBookingStore()

const TABS = [
  { key: 'WAIT_PAY', label: '待支付' },
  { key: 'BOOKED', label: '已预约' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'CANCELED', label: '退号·爽约' },
]

const TAB_KEYS = TABS.map((tab) => tab.key)

const CANCELED_SUBS = [
  { key: 'CANCELED_ACTIVE', label: '主动退号' },
  { key: 'CANCELED_PASSIVE', label: '停诊退号' },
  { key: 'NOSHOW', label: '已爽约' },
  // 待支付取消 / 超时关单的终态：不放进这个 tab 就会「取消后到处都找不到」
  { key: 'CLOSED', label: '已关闭' },
]

/**
 * 「已预约」tab 的二级：已预约 / 已签到（S15.2）
 *
 * 到院签到后预约会从「已预约」变成「已签到」，此前列表里没有任何入口；
 * B2 的 `status` 必填且一次只查一个状态（契约 §4.2），所以拆成子筛选而不是合并查询。
 */
const BOOKED_SUBS = [
  { key: 'BOOKED', label: '已预约' },
  { key: 'SIGNED', label: '已签到' },
]

const PAGE_SIZE = 10

const activeTab = ref('WAIT_PAY')
/** 各 tab 自己的子状态：离开再回来记住上次所选，默认取子项第一项 */
const subState = ref<Record<string, string>>({
  BOOKED: BOOKED_SUBS[0].key,
  CANCELED: CANCELED_SUBS[0].key,
})
const rows = ref<RegistrationRowVo[]>([])
const total = ref(0)
const pageNum = ref(1)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
/** 用户手动切过 tab（或带意图进来）后，不再自动改落点 */
const tabPicked = ref(false)
let defaultResolved = false

/** 当前 tab 的子筛选项；无二级的 tab 返回空数组（子筛选行不渲染） */
const currentSubs = computed(() => {
  if (activeTab.value === 'BOOKED') {
    return BOOKED_SUBS
  }
  return activeTab.value === 'CANCELED' ? CANCELED_SUBS : []
})

const currentSub = computed(() => subState.value[activeTab.value] ?? '')

/** 查询用的状态：有子筛选取子状态，否则取 tab 本身 —— B2 永远只收到一个 `status` */
const queryStatus = computed(() => currentSub.value || activeTab.value)

const isEmpty = computed(() => !loading.value && !error.value && rows.value.length === 0)
const finished = computed(() => rows.value.length >= total.value)

/** 空态文案随子状态变化：已签到为空时不能再说「请选择科室与医生完成预约」 */
const emptyText = computed(() => (queryStatus.value === 'SIGNED' ? '暂无已签到预约' : '暂无预约记录'))
const emptyDesc = computed(() =>
  queryStatus.value === 'SIGNED' ? '到院签到后，预约会显示在这里' : '请选择科室与医生完成预约',
)

function goDetail(row: RegistrationRowVo): void {
  navigateTo(ROUTES.registrationDetail, { registrationId: row.registrationId })
}

/**
 * 再次预约
 *
 * B2 行只有 `staffName / deptName`，**没有 `staffId / deptId`** → 只能经 B3 取 `staff.staffId`
 * 再进医生主页（A4 会给出 `deptId`，「查看排班」才有上下文）。不凭空造 id。
 */
async function rebook(row: RegistrationRowVo): Promise<void> {
  try {
    const detail = await getRegistrationDetail(row.registrationId)
    const staffId = detail.staff?.staffId
    if (!staffId) {
      uni.showToast({ title: '该预约缺少医生信息，请到科室列表重新选择', icon: 'none' })
      return
    }
    navigateTo(ROUTES.doctorDetail, { staffId })
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  }
}

async function load(reset: boolean): Promise<void> {
  if (!userStore.isLogin) {
    rows.value = []
    total.value = 0
    return
  }
  if (reset) {
    pageNum.value = 1
    loading.value = true
    error.value = ''
  } else {
    loadingMore.value = true
  }
  try {
    const page = await listRegistrations({
      status: queryStatus.value,
      pageNum: pageNum.value,
      pageSize: PAGE_SIZE,
    })
    rows.value = reset ? page.rows : [...rows.value, ...page.rows]
    total.value = page.total
  } catch (e) {
    error.value = bizMessage(e)
    if (reset) {
      rows.value = []
      total.value = 0
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function switchTabTo(key: string): void {
  if (activeTab.value === key) {
    return
  }
  tabPicked.value = true
  activeTab.value = key
  void load(true)
}

/**
 * 首次进入的落点：有待支付单就停在「待支付」（最需要动作），否则落「已预约」
 * 否则「付完款回来」或「本来就没有待支付」都会被丢在一个空页面
 */
async function resolveDefaultTab(): Promise<void> {
  if (defaultResolved || tabPicked.value) {
    return
  }
  // 未登录不探测：B2 需要登录态，发了只会 401 把用户弹去登录页
  if (!userStore.isLogin) {
    return
  }
  defaultResolved = true
  try {
    const page = await listRegistrations({ status: 'WAIT_PAY', pageNum: 1, pageSize: 1 })
    if (page.total === 0) {
      activeTab.value = 'BOOKED'
    }
  } catch {
    /* 探测失败就保持默认「待支付」，不阻塞列表加载 */
  }
}

async function refresh(): Promise<void> {
  // 兜底：activeTab 必须是已知 tab（历史 bug：意图被传成事件对象时会出现未知值 → 无高亮 + 空列表）
  if (!TAB_KEYS.includes(activeTab.value)) {
    activeTab.value = 'WAIT_PAY'
    tabPicked.value = false
  }
  const intent = booking.takeListIntent()
  if (intent && TAB_KEYS.includes(intent)) {
    tabPicked.value = true
    if (intent !== activeTab.value) {
      activeTab.value = intent
    }
    resetSub(intent)
  } else {
    await resolveDefaultTab()
  }
  await load(true)
}

function switchSub(key: string): void {
  if (currentSub.value === key) {
    return
  }
  subState.value = { ...subState.value, [activeTab.value]: key }
  void load(true)
}

/** 落点意图必须回到该 tab 的默认子状态，否则「支付成功 → 查看预约」可能停在「已签到」看到空列表 */
function resetSub(tabKey: string): void {
  const subs = tabKey === 'BOOKED' ? BOOKED_SUBS : tabKey === 'CANCELED' ? CANCELED_SUBS : []
  if (subs.length) {
    subState.value = { ...subState.value, [tabKey]: subs[0].key }
  }
}

function goLogin(): void {
  navigateTo(ROUTES.login)
}

function goHome(): void {
  switchTab(ROUTES.home)
}

/** B2 行不含 paymentNo → 先取 B3 的 payment 摘要 */
async function fetchPayment(registrationId: string): Promise<PaymentBriefVo | null> {
  try {
    const detail = await getRegistrationDetail(registrationId)
    if (!detail.payment?.paymentNo) {
      uni.showToast({ title: '该预约暂无支付单', icon: 'none' })
      return null
    }
    return detail.payment
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
    return null
  }
}

async function payNow(row: RegistrationRowVo): Promise<void> {
  const payment = await fetchPayment(row.registrationId)
  if (!payment) {
    return
  }
  navigateTo(ROUTES.bookingPayment, {
    paymentNo: payment.paymentNo,
    amount: payment.amount,
    expireTime: payment.expireTime,
  })
}

function cancelBooking(row: RegistrationRowVo): void {
  uni.showModal({
    title: '取消本次预约',
    content: `取消后 ${row.staffName} 的号源会立即释放。`,
    cancelText: '取消',
    confirmText: '确认取消',
    success: (res) => {
      if (!res.confirm) {
        return
      }
      void doCancel(row)
    },
  })
}

async function doCancel(row: RegistrationRowVo): Promise<void> {
  const payment = await fetchPayment(row.registrationId)
  if (!payment) {
    return
  }
  try {
    const result = await cancelUnpaidPayment(payment.paymentNo)
    uni.showToast({
      title: result.status === 'CLOSED' ? '已取消，可在「退号·爽约 → 已关闭」查看' : '该预约已完成支付，未取消',
      icon: 'none',
    })
    void load(true)
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  }
}

onShow(() => {
  // 支付成功「查看预约」等入口通过 store 指定落点（tab 页带不了 query）
  void refresh()
})

onReachBottom(() => {
  if (loading.value || loadingMore.value || finished.value) {
    return
  }
  pageNum.value += 1
  void load(false)
})
</script>

<template>
  <view class="appt-page record">
    <view class="record__tabs">
      <view
        v-for="tab in TABS"
        :key="tab.key"
        class="record__tab"
        :class="{ 'record__tab--active': activeTab === tab.key }"
        @click="switchTabTo(tab.key)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view v-if="currentSubs.length" class="record__subs">
      <view
        v-for="sub in currentSubs"
        :key="sub.key"
        class="record__sub"
        :class="{ 'record__sub--active': currentSub === sub.key }"
        @click="switchSub(sub.key)"
      >
        {{ sub.label }}
      </view>
    </view>

    <view class="appt-content record__body">
      <view v-if="!userStore.isLogin" class="record__panel">
        <PageState :empty="true" empty-text="未登录，无法查看预约" empty-desc="登录后可查看待支付、已预约与历史记录">
          <template #empty-action>
            <wd-button size="small" type="primary" @click="goLogin">去登录</wd-button>
          </template>
        </PageState>
      </view>

      <PageState
        v-else
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        :empty-text="emptyText"
        :empty-desc="emptyDesc"
        :rows="3"
        @retry="load(true)"
      >
        <template #empty-action>
          <wd-button size="small" variant="plain" type="primary" @click="goHome">去预约</wd-button>
        </template>

        <view
          v-for="row in rows"
          :key="row.registrationId"
          class="record__card appt-card appt-press"
          @click="goDetail(row)"
        >
          <view class="record__bar" :class="`record__bar--${row.status}`" />
          <view class="record__head">
            <text class="record__title">{{ row.staffName }} · {{ row.deptName }}</text>
            <StatusTag :status="row.status" />
          </view>
          <text class="record__line">
            {{ row.campusName }} · {{ formatVisitDate(row.visitDate) }} {{ timePointText(row.timePoint) }}
          </text>
          <text class="record__line record__line--weak">{{ row.patientName }} · {{ periodLabel(row.period) }} · {{ row.registrationNo }}</text>

          <view class="record__actions">
            <template v-if="row.status === 'WAIT_PAY'">
              <wd-button size="small" variant="plain" @click.stop="cancelBooking(row)">取消</wd-button>
              <view class="record__action-gap" />
              <wd-button size="small" type="primary" @click.stop="payNow(row)">去支付</wd-button>
            </template>
            <!-- 已预约与已签到都要出示就诊码（契约 §4.3：两者都返回 visitCode） -->
            <template v-else-if="row.status === 'BOOKED' || row.status === 'SIGNED'">
              <wd-button size="small" type="primary" @click.stop="goDetail(row)">查看就诊码</wd-button>
            </template>
            <template v-else>
              <wd-button size="small" variant="plain" @click.stop="rebook(row)">再次预约</wd-button>
            </template>
          </view>
        </view>

        <view v-if="rows.length" class="record__footer">
          <text class="appt-weak">{{ loadingMore ? '加载中…' : finished ? '没有更多了' : '上拉加载更多' }}</text>
        </view>
      </PageState>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.record {
  &__tabs {
    display: flex;
    background-color: var(--appt-surface);
  }

  &__tab {
    position: relative;
    flex: 1;
    padding: 24rpx 0;
    font-size: 28rpx;
    color: var(--appt-text-weak);
    text-align: center;

    &--active {
      font-weight: 600;
      color: var(--appt-primary);

      &::after {
        position: absolute;
        bottom: 8rpx;
        left: 50%;
        width: 48rpx;
        height: 4rpx;
        margin-left: -24rpx;
        border-radius: 999rpx;
        background-color: var(--appt-primary);
        content: '';
      }
    }
  }

  &__subs {
    display: flex;
    padding: 20rpx 32rpx 0;
  }

  &__sub {
    margin-right: 16rpx;
    padding: 8rpx 20rpx;
    border-radius: 8rpx;
    background-color: var(--appt-surface-weak);
    font-size: 24rpx;
    color: var(--appt-text-sub);

    &--active {
      background-color: rgba(31, 122, 140, 0.12);
      color: var(--appt-primary);
    }
  }

  &__body {
    padding-top: 20rpx;
  }

  &__panel {
    padding-top: 40rpx;
  }

  &__card {
    position: relative;
    overflow: hidden;
    padding-left: 32rpx;

    & + & {
      margin-top: 20rpx;
    }
  }

  /* 左侧 4rpx 状态色竖条（颜色取 DESIGN §2.3） */
  &__bar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 4rpx;
    background-color: var(--appt-text-weak);

    &--WAIT_PAY {
      background-color: #d98e04;
    }

    &--BOOKED {
      background-color: #3b82c4;
    }

    &--SIGNED {
      background-color: #2e9e6b;
    }

    &--COMPLETED {
      background-color: #5a667e;
    }

    &--NOSHOW {
      background-color: #d14343;
    }

    &--CANCELED_PASSIVE {
      background-color: #d98e04;
    }
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    flex: 1;
    margin-right: 16rpx;
    font-size: 32rpx;
    font-weight: 600;
    line-height: 1.4;
    color: var(--appt-text);
  }

  &__line {
    display: block;
    margin-top: 8rpx;
    font-size: 26rpx;
    line-height: 1.5;
    color: var(--appt-text-sub);

    &--weak {
      color: var(--appt-text-weak);
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-top: 24rpx;
  }

  &__action-gap {
    width: 16rpx;
  }

  &__footer {
    padding: 24rpx 0 40rpx;
    text-align: center;
  }
}
</style>
