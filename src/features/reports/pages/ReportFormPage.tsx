import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { ReportTargetType } from '@/features/admin/model/operationsTypes'
import { allowedReportReasons, reportReasonLabels, reportsApi, type ReportReasonCode } from '@/features/reports/api/reportsApi'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'
import '@/features/reports/reportFlows.css'

const targetTypes: ReportTargetType[] = ['LISTING', 'USER', 'MESSAGE', 'COMMUNITY_POST', 'COMMUNITY_COMMENT']

export function ReportFormPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const targetTypeParam = params.get('targetType')
  const targetType = targetTypes.find((value) => value === targetTypeParam)
  const targetId = Number(params.get('targetId'))
  const validTarget = !!targetType && Number.isSafeInteger(targetId) && targetId > 0
  const [reason, setReason] = useState<ReportReasonCode | ''>('')
  const [detail, setDetail] = useState('')
  const createReport = useMutation({ mutationFn: () => reportsApi.create(targetType!, targetId, reason as ReportReasonCode, detail) })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validTarget || !reason || detail.length > 500) return
    createReport.mutate(undefined, { onSuccess: () => navigate('/reports/me', { replace: true }) })
  }

  return <div className="app-page collection-page">
    <PageHeader title="신고하기" />
    <main className="content-shell">
      {!validTarget ? <div className="state-panel" role="alert">신고 대상을 확인할 수 없습니다. <Link to="/">홈으로</Link></div> :
        <form className="form-card" onSubmit={submit}>
          <h1>신고 사유</h1>
          <p>대상 {targetType} #{targetId}</p>
          <label htmlFor="report-reason">사유</label>
          <select id="report-reason" value={reason} required onChange={(event) => setReason(event.target.value as ReportReasonCode)}>
            <option value="">선택해 주세요</option>
            {allowedReportReasons[targetType].map((value) => <option key={value} value={value}>{reportReasonLabels[value]}</option>)}
          </select>
          <label htmlFor="report-detail">상세 내용 (선택)</label>
          <textarea id="report-detail" maxLength={500} value={detail} onChange={(event) => setDetail(event.target.value)} />
          {createReport.isError && <p className="field-error" role="alert">{createReport.error.message}</p>}
          <button className="button button--primary" type="submit" disabled={createReport.isPending}>{createReport.isPending ? '접수 중…' : '신고 접수'}</button>
        </form>}
    </main>
    <MobileBottomNavigation />
  </div>
}
