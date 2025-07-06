import { Suspense, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/demo/convex')({
  component: App,
})

function Products() {
  const products = useQuery(api.products.get)

  return (
    <ul>
      {(products || []).map((p) => (
        <li key={p._id}>
          {p.title} - {p.price}
        </li>
      ))}
    </ul>
  )
}

function App() {
  const ref = useRef<HTMLInputElement>(null)
  const mutate = useMutation(api.products.add)
  return (
    <div className="p-4 ">
      <div className="flex gap-2">
        <input className="p-2 border" ref={ref} type="text" />
        <button
          className="p-2 border rounded"
          onClick={() => {
            mutate({ title: ref.current?.value || '' })
            ref.current!.value = ''
          }}
        >
          Add
        </button>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <Products />
      </Suspense>
    </div>
  )
}
