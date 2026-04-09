/**
 * Example Hooks
 */

import { useState, useCallback } from 'react'
import type { Example } from './example.types'
import { ExampleService } from './example.service'

export const useExampleController = () => {
  const [examples, setExamples] = useState<Example[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadExamples = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ExampleService.getAll()
      setExamples(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading examples')
    } finally {
      setLoading(false)
    }
  }, [])

  return { examples, loading, error, loadExamples }
}
