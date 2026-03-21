type Props = {
  reading: string
  index: number
  isComplete: boolean
  isCatchup: boolean
  onToggle: (index: number) => void
}

export default function ReadingItem({ reading, index, isComplete, isCatchup, onToggle }: Props) {
  return (
    <button
      onClick={() => onToggle(index)}
      role="checkbox"
      aria-checked={isComplete}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-opacity ${
        isCatchup
          ? 'bg-red-50 border border-red-200'
          : 'bg-[#f0ebe1]'
      } ${isComplete ? 'opacity-60' : ''}`}
    >
      <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 ${
        isComplete
          ? 'bg-[#5c4a2a] border-[#5c4a2a]'
          : isCatchup
          ? 'border-red-400'
          : 'border-[#5c4a2a]'
      }`}>
        {isComplete && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`font-medium ${isComplete ? 'line-through text-stone-400' : 'text-stone-800'}`}>
        {reading}
      </span>
    </button>
  )
}
