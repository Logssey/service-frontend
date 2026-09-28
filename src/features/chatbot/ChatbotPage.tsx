import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '@/shared/api/http'
import { ApiClientError } from '@/shared/api/http'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'

interface SuggestedQuestion {
  questionId: number
  question: string
}

interface ChatbotAnswer {
  answer: string
  source: 'PREDEFINED' | 'LLM' | 'OUT_OF_SCOPE'
}

interface Exchange {
  id: number
  question: string
  answer: string
}

export function ChatbotPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [error, setError] = useState<string | null>(null)
  const questions = useQuery({
    queryKey: ['chatbot', 'suggested-questions'],
    queryFn: () => apiRequest<SuggestedQuestion[]>('/chatbot/suggested-questions'),
    retry: false,
  })
  const unauthenticated = questions.error instanceof ApiClientError && questions.error.status === 401
  const ask = useMutation({
    mutationFn: (question: SuggestedQuestion) => apiRequest<ChatbotAnswer>('/chatbot/messages', {
      method: 'POST', body: JSON.stringify({ questionId: question.questionId }),
    }),
    onSuccess: (answer, question) => {
      setError(null)
      setExchanges((current) => [...current, {
        id: current.length + 1,
        question: question.question,
        answer: answer.answer,
      }])
    },
    onError: (failure) => setError(failure instanceof ApiClientError && failure.status === 429
      ? '잠시 후 다시 질문해 주세요.' : '답변을 받지 못했습니다. 다시 시도해 주세요.'),
  })

  return (
    <div className="app-page collection-page">
      <PageHeader title="도움말 챗봇" />
      <main className="content-shell collection-content">
        <p>서비스 이용에 관한 추천 질문을 선택해 주세요. 자유 입력은 현재 제공하지 않습니다.</p>
        {unauthenticated ? <EmptyState title="로그인이 필요합니다"
          description="로그인 후 도움말을 이용할 수 있어요."
          action={<Link className="button button--primary" to="/login">로그인</Link>} /> : null}
        {questions.isLoading ? <LoadingState label="질문을 불러오는 중" /> : null}
        {questions.isError && !unauthenticated ? <ErrorState title="챗봇을 이용할 수 없어요"
          description="잠시 후 다시 시도해 주세요."
          retry={() => void questions.refetch()} /> : null}
        {questions.data ? <section aria-labelledby="chatbot-questions-heading">
          <h2 id="chatbot-questions-heading">추천 질문</h2>
          <div className="chatbot-suggestions">
            {questions.data.map((question) => <button className="button button--secondary"
              type="button" key={question.questionId} disabled={ask.isPending}
              onClick={() => ask.mutate(question)}>{question.question}</button>)}
          </div>
        </section> : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className="chatbot-exchanges" aria-live="polite">
          {exchanges.map((exchange) => <article key={exchange.id} className="chatbot-exchange">
            <h3>{exchange.question}</h3>
            <p>{exchange.answer}</p>
          </article>)}
        </div>
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
