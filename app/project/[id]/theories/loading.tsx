import StepLoading from '@/components/ui/StepLoading'

export default function Loading() {
  return (
    <StepLoading
      title="Finding theories for your question"
      steps={['Reading your question and answers…', 'Matching theories from the library…', 'Checking citations in OpenAlex…', 'Explaining why each one fits…']}
    />
  )
}
