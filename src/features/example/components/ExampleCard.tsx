/**
 * Example Card Component
 */

import type { Example } from '../example.types'

interface ExampleCardProps {
  item: Example
}

export function ExampleCard({ item }: ExampleCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
      <p className="text-gray-600 mb-4">{item.description}</p>
      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition">
        View Details
      </button>
    </div>
  )
}
