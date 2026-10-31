import StepLoading from '@/components/ui/StepLoading'

export default function Loading() {
  return (
    <StepLoading
      title="Deriving your methodology"
      steps={['Reading your question and framework…', 'Choosing a design that fits…', 'Explaining why at each step…']}
    />
  )
}
