<script setup lang="ts">
/**
 * 我的就诊人（S11 · 契约 §4.6–§4.8）
 *
 * 字段：B6 `id / name / idType / idNoMasked / isDefault / createTime`。
 * 编辑规则（契约 §4.8）：`idNo` 留空 = 不修改；**改了 `idType` 就必须同时填证件号**（否则后端 400）。
 * 证件号全程只显示脱敏串，完整号仅在「修改证件」输入框里短暂存在，不落日志、不回显。
 */
import { onShow } from '@dcloudio/uni-app'
import { computed, reactive, ref } from 'vue'

import type { PatientVo } from '@/api/appt/types'
import { addPatient, deletePatient, listPatients, setDefaultPatient, updatePatient } from '@/api/appt/patient'
import PageState from '@/components/PageState.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { bizMessage, idTypeLabel } from '@/utils/appt'

const { data: patients, loading, error, isEmpty, run } = useAsyncData<PatientVo[]>(
  listPatients,
  (list) => list.length === 0,
)

const popupVisible = ref(false)
const saving = ref(false)
const editingId = ref('')
const showIdNoInput = ref(false)
const formError = ref('')

const form = reactive({
  name: '',
  idType: 'IDCARD',
  idNo: '',
})

const isEditing = computed(() => Boolean(editingId.value))
const popupTitle = computed(() => (isEditing.value ? '编辑就诊人' : '新增就诊人'))
const editingPatient = computed<PatientVo | null>(
  () => (patients.value ?? []).find((item) => item.id === editingId.value) ?? null,
)
/** 编辑时只要没主动改类型，就不强制填证件号 */
const originalIdType = computed(() => editingPatient.value?.idType ?? '')

function openCreate(): void {
  editingId.value = ''
  form.name = ''
  form.idType = 'IDCARD'
  form.idNo = ''
  showIdNoInput.value = true
  formError.value = ''
  popupVisible.value = true
}

function openEdit(patient: PatientVo): void {
  editingId.value = patient.id
  form.name = patient.name
  form.idType = patient.idType
  form.idNo = ''
  // 证件号默认只显示脱敏串，点「修改证件」才展开输入框（留空 = 不改）
  showIdNoInput.value = false
  formError.value = ''
  popupVisible.value = true
}

function toggleIdNoInput(): void {
  showIdNoInput.value = !showIdNoInput.value
  if (!showIdNoInput.value) {
    form.idNo = ''
  }
}

async function submit(): Promise<void> {
  if (saving.value) {
    return
  }
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = '请填写就诊人姓名'
    return
  }
  const idTypeChanged = isEditing.value && form.idType !== originalIdType.value
  const idNo = form.idNo.trim()
  if (!isEditing.value && !idNo) {
    formError.value = '请填写证件号（身份证或就诊卡号）'
    return
  }
  if (idTypeChanged && !idNo) {
    formError.value = '修改证件类型时必须同时填写新的证件号'
    return
  }

  saving.value = true
  try {
    if (isEditing.value) {
      await updatePatient(editingId.value, {
        name: form.name.trim(),
        idType: form.idType,
        ...(idNo ? { idNo } : {}),
      })
      uni.showToast({ title: '已保存', icon: 'none' })
    } else {
      await addPatient({
        name: form.name.trim(),
        idType: form.idType,
        idNo,
        isDefault: false,
      })
      uni.showToast({ title: '就诊人添加成功', icon: 'none' })
    }
    popupVisible.value = false
    await run()
  } catch (e) {
    formError.value = bizMessage(e)
  } finally {
    saving.value = false
  }
}

function confirmDelete(patient: PatientVo): void {
  uni.showModal({
    title: '删除就诊人',
    content: `删除后「${patient.name}」的历史预约仍可查询，但不能再用于挂号。`,
    cancelText: '取消',
    confirmText: '确认删除',
    success: (res) => {
      if (res.confirm) {
        void doDelete(patient)
      }
    },
  })
}

async function doDelete(patient: PatientVo): Promise<void> {
  try {
    await deletePatient(patient.id)
    uni.showToast({ title: '已删除', icon: 'none' })
    await run()
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  }
}

async function makeDefault(patient: PatientVo): Promise<void> {
  if (patient.isDefault) {
    return
  }
  try {
    await setDefaultPatient(patient.id)
    uni.showToast({ title: '已设为默认', icon: 'none' })
    await run()
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  }
}

onShow(() => {
  void run()
})
</script>

<template>
  <view class="appt-page patient">
    <view class="appt-content patient__body">
      <PageState
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-text="暂无就诊人"
        empty-desc="预约挂号需绑定实名就诊人信息，请先添加"
        :rows="3"
        @retry="run"
      >
        <template #empty-action>
          <wd-button size="small" type="primary" @click="openCreate">添加就诊人</wd-button>
        </template>

        <view v-for="item in patients || []" :key="item.id" class="appt-card patient__card">
          <view class="patient__head">
            <text class="patient__name">{{ item.name }}</text>
            <text v-if="item.isDefault" class="patient__badge">默认</text>
          </view>
          <text class="appt-weak">{{ idTypeLabel(item.idType) }} {{ item.idNoMasked }}</text>

          <view class="patient__actions">
            <text
              v-if="!item.isDefault"
              class="patient__action"
              @click="makeDefault(item)"
            >设为默认</text>
            <text class="patient__action" @click="openEdit(item)">编辑</text>
            <text class="patient__action patient__action--danger" @click="confirmDelete(item)">删除</text>
          </view>
        </view>

        <text class="appt-weak patient__limit">最多可添加 10 位就诊人；删除默认就诊人后需重新指定</text>
      </PageState>
    </view>

    <view class="appt-bottom-bar">
      <wd-button type="primary" block @click="openCreate">新增就诊人</wd-button>
    </view>
    <view class="appt-bottom-placeholder" />

    <!-- 弹层：z-index 必须高于底部固定条（20），否则「保存」被底栏盖住 -->
    <wd-popup v-model="popupVisible" position="bottom" round :z-index="1000">
      <view class="patient__sheet">
        <text class="appt-section-title">{{ popupTitle }}</text>
        <text class="appt-weak patient__sheet-hint">请填写与证件一致的就诊人信息；本系统为演示环境，不接入真实医疗系统</text>

        <view class="patient__field">
          <text class="patient__label">姓名<text class="patient__required">*</text></text>
          <wd-input v-model="form.name" placeholder="请输入就诊人姓名" />
        </view>

        <view class="patient__field">
          <text class="patient__label">证件类型</text>
          <view class="patient__chips">
            <view
              v-for="type in ['IDCARD', 'CARD']"
              :key="type"
              class="patient__chip"
              :class="{ 'patient__chip--active': form.idType === type }"
              @click="form.idType = type"
            >
              {{ idTypeLabel(type) }}
            </view>
          </view>
        </view>

        <view v-if="isEditing" class="patient__field">
          <view class="patient__label-row">
            <text class="patient__label">证件号</text>
            <text class="appt-link" @click="toggleIdNoInput">{{ showIdNoInput ? '取消修改' : '修改证件' }}</text>
          </view>
          <text v-if="!showIdNoInput" class="appt-weak">{{ editingPatient?.idNoMasked }}</text>
          <wd-input
            v-else
            v-model="form.idNo"
            placeholder="输入新证件号（留空则不修改）"
          />
        </view>

        <view v-else class="patient__field">
          <text class="patient__label">证件号<text class="patient__required">*</text></text>
          <wd-input v-model="form.idNo" placeholder="请输入身份证号或就诊卡号" />
        </view>

        <text v-if="formError" class="patient__error">{{ formError }}</text>

        <view class="patient__sheet-actions">
          <wd-button variant="plain" @click="popupVisible = false">取消</wd-button>
          <wd-button type="primary" :loading="saving" :disabled="saving" @click="submit">保存</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<style lang="scss" scoped>
.patient {
  &__body {
    padding-top: 24rpx;
  }

  &__card + &__card {
    margin-top: 20rpx;
  }

  &__head {
    display: flex;
    align-items: center;
    margin-bottom: 8rpx;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: var(--appt-text);
  }

  &__badge {
    margin-left: 12rpx;
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
    background-color: rgba(31, 122, 140, 0.12);
    font-size: 22rpx;
    color: var(--appt-primary);
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 20rpx;
  }

  &__action {
    margin-left: 28rpx;
    font-size: 26rpx;
    color: var(--appt-primary);

    &--danger {
      color: var(--appt-danger);
    }
  }

  &__limit {
    display: block;
    margin-top: 24rpx;
    text-align: center;
  }

  &__sheet {
    padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  }

  &__sheet-hint {
    display: block;
    margin-top: 8rpx;
  }

  &__field {
    margin-top: 24rpx;
  }

  &__label {
    font-size: 26rpx;
    color: var(--appt-text-sub);
  }

  &__label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12rpx;
  }

  &__required {
    margin-left: 4rpx;
    color: var(--appt-danger);
  }

  &__chips {
    display: flex;
    margin-top: 12rpx;
  }

  &__chip {
    margin-right: 16rpx;
    padding: 12rpx 28rpx;
    border: 1rpx solid var(--appt-line);
    border-radius: 12rpx;
    font-size: 26rpx;
    color: var(--appt-text-sub);

    &--active {
      border-color: var(--appt-primary);
      background-color: rgba(31, 122, 140, 0.08);
      color: var(--appt-primary);
    }
  }

  &__error {
    display: block;
    margin-top: 20rpx;
    font-size: 24rpx;
    color: var(--appt-danger);
  }

  &__sheet-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 32rpx;
  }
}
</style>
