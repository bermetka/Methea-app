import StepLoading from '@/components/ui/StepLoading'

export default function Loading() {
  return (
    <StepLoading
      title="Preparing your reading"
      steps={['Opening the guide for each theory…', 'Finding recent work on your topic…', 'Getting your reading list ready…']}
    />
  )
}
