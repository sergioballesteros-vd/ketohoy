'use client'

import { useEffect } from 'react'

export default function OfflineSupport() {
  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/shopping-list-sw.js', { scope: '/' }).catch(() => {})
  }, [])
  return null
}
