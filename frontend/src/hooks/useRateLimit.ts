import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const DAILY_LIMIT = 12
const STORAGE_KEY = 'metrik_requests'

interface RequestData {
  count: number
  date: string
}

export function useRateLimit() {
  const { user, isPremium, premiumLoading } = useAuth()  // ← Utilise isPremium du AuthContext
  const [requestCount, setRequestCount] = useState(0)
  const [canMakeRequest, setCanMakeRequest] = useState(true)

  // Charger le compteur depuis localStorage (seulement pour les utilisateurs gratuits)
  useEffect(() => {
    // Si premium, pas de limite
    if (isPremium) {
      setCanMakeRequest(true)
      setRequestCount(0)
      return
    }

    // Si pas connecté ou gratuit, gérer le rate limiting
    const today = new Date().toISOString().split('T')[0]
    const stored = localStorage.getItem(STORAGE_KEY)

    if (stored) {
      try {
        const data: RequestData = JSON.parse(stored)
        
        // Si c'est un nouveau jour, reset le compteur
        if (data.date !== today) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, date: today }))
          setRequestCount(0)
          setCanMakeRequest(true)
        } else {
          setRequestCount(data.count)
          setCanMakeRequest(data.count < DAILY_LIMIT)
        }
      } catch (error) {
        console.error('Error parsing request data:', error)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, date: today }))
        setRequestCount(0)
        setCanMakeRequest(true)
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, date: today }))
      setRequestCount(0)
      setCanMakeRequest(true)
    }
  }, [isPremium])

  const incrementRequest = () => {
    // Si abonnement premium, ne rien incrémenter
    if (isPremium) {
      console.log('✨ METRIK+ user - unlimited requests')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const newCount = requestCount + 1

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: newCount, date: today }))
    setRequestCount(newCount)
    setCanMakeRequest(newCount < DAILY_LIMIT)

    console.log(`📊 Request ${newCount}/${DAILY_LIMIT}`)
  }

  const resetCount = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, date: today }))
    setRequestCount(0)
    setCanMakeRequest(true)
  }

  return {
    requestCount,
    canMakeRequest,
    incrementRequest,
    resetCount,
    dailyLimit: DAILY_LIMIT,
    isUnlimited: isPremium,  // ← Utilise isPremium
    loading: premiumLoading
  }
}