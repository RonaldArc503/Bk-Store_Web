/**
 * Example Page
 */

import { useEffect } from 'react'
import { useExampleController } from './example.hooks'
import { ExampleCard } from './components/ExampleCard'
import { Loader } from '../../components/Loader'

export default function ExamplePage() {
  const { examples, loading, error, loadExamples } = useExampleController()

  useEffect(() => {
    loadExamples()
  }, [loadExamples])

  if (loading) return <Loader />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Examples</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {examples.map((example) => (
          <ExampleCard key={example.id} item={example} />
        ))}
      </div>
    </div>
  )
}
