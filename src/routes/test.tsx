import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/test')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <button onClick={() => console.log('test')}>Test</button>
    </div>
  )
}
