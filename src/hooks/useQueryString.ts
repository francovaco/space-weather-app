'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function useQueryString() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

  const setQueryString = useCallback(
    (name: string, value: string) => {
      router.push(`?${createQueryString(name, value)}`, { scroll: false })
    },
    [router, createQueryString]
  )

  return { searchParams, setQueryString, createQueryString }
}
