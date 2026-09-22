import { Eye, EyeOff } from 'lucide-react'
import { useId, useState } from 'react'

/**
 * 화면설계서의 비밀번호 입력란. 오른쪽 ◎ 표시가 보기/숨기기 토글이다.
 */
export function PasswordField({
  label,
  value,
  placeholder,
  autoComplete,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  autoComplete: string
  onChange: (value: string) => void
}) {
  const inputId = useId()
  const [visible, setVisible] = useState(false)

  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="field__row">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={128}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="icon-button icon-button--field"
          type="button"
          aria-label={visible ? `${label} 숨기기` : `${label} 표시`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
