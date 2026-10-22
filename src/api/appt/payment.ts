/**
 * 支付组 C2–C3（登录）
 *
 * 支付单在 B1 提交挂号时已创建，前端**没有**「创建支付」端点；
 * `mock-pay` 只返回「已受理」，真实状态靠 C3 轮询（契约 §5.2 / §5.3）。
 */
import type { MockPayVo, PaymentVo } from '@/api/appt/types'
import { request } from '@/utils/request'

/** C2 模拟支付（result 默认 SUCCESS；FAIL / TIMEOUT 是演示分支） */
export function mockPay(paymentNo: string, result: 'SUCCESS' | 'FAIL' | 'TIMEOUT' = 'SUCCESS'): Promise<MockPayVo> {
  return request<MockPayVo>({
    url: `/appt/patient/payment/${paymentNo}/mock-pay`,
    method: 'POST',
    data: { result },
    silent: true,
  })
}

/** C3 支付状态查询（服务端 5s 节流，前端 2s 轮询仍可拿到本地状态） */
export function getPayment(paymentNo: string): Promise<PaymentVo> {
  return request<PaymentVo>({ url: `/appt/patient/payment/${paymentNo}`, silent: true })
}
