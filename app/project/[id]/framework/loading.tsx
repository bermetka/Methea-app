import StepLoading from '@/components/ui/StepLoading'

export default function Loading() {
  return (
    <StepLoading
      title="Connecting your theories"
      steps={['Reading the theories you chose…', 'Working out how they relate…', 'Drawing your framework…']}
    />
  )
}
