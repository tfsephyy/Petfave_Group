import { useEffect, useState } from 'react'
import { api } from './api'

export function useResource(path) {
  const [result, setResult] = useState({ path: null, version: -1, data: null, error: null })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api(path, { signal: controller.signal })
      .then((data) => setResult({ path, version, data, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ path, version, data: null, error })
      })
    return () => controller.abort()
  }, [path, version])
  return {
    data: result.data,
    error: result.error,
    loading: result.path !== path || result.version !== version,
    reload: () => setVersion((v) => v + 1),
  }
}
export function useDebounce(value, delay = 300) {
  const [result, setResult] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setResult(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return result
}
