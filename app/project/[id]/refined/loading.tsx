import StepLoading from '@/components/ui/StepLoading'

export default function Loading() {
  return (
    <StepLoading
      title="Sharpening your research question"
      steps={['Reading your brief and answers…', 'Narrowing who, where and what…', 'Writing your refined question…']}
    />
  )
}
