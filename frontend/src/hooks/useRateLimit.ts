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
  const { user } = useAuth()
  const [requestCount, setRequestCount] = useState(0)
  const [canMakeRequest, setCanMakeRequest] = useState(true)
  const [isUnlimited, setIsUnlimited] = useState(false)
  const [loading, setLoading] = useState(true)

  // Vérifier si l'utilisateur a un abonnement actif
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsUnlimited(false)
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('status, plan')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (data && !error) {
          setIsUnlimited(true)
          console.log('✅ User has active subscription:', data.plan)
        } else {
          setIsUnlimited(false)
        }
      } catch (error) {
        console.log('No active subscription found')
        setIsUnlimited(false)
      } finally {
        setLoading(false)
      }
    }

    checkSubscription()
  }, [user])

  // Charger le compteur depuis localStorage
  useEffect(() => {
    if (isUnlimited) {
      setCanMakeRequest(true)
      return
    }

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
  }, [isUnlimited])

  const incrementRequest = () => {
    // Si abonnement illimité, ne rien faire
    if (isUnlimited) {
      console.log('✨ Unlimited user - no rate limit')
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
    isUnlimited,
    loading
  }
}