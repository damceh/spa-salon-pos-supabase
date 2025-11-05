import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'

interface AuthContextType {
  user: User | null
  session: Session | null
  userRole: string | null
  userFullName: string | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userFullName, setUserFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Permission system
  const permissions = {
    super_admin: [
      'users.create', 'users.read', 'users.update', 'users.delete',
      'therapists.create', 'therapists.read', 'therapists.update', 'therapists.delete',
      'services.create', 'services.read', 'services.update', 'services.delete',
      'products.create', 'products.read', 'products.update', 'products.delete',
      'customers.create', 'customers.read', 'customers.update', 'customers.delete',
      'appointments.create', 'appointments.read', 'appointments.update', 'appointments.delete',
      'transactions.create', 'transactions.read', 'transactions.update', 'transactions.delete',
      'reports.read', 'webhooks.create', 'webhooks.read', 'webhooks.update', 'webhooks.delete'
    ],
    manager: [
      'therapists.create', 'therapists.read', 'therapists.update',
      'services.create', 'services.read', 'services.update',
      'products.create', 'products.read', 'products.update',
      'customers.create', 'customers.read', 'customers.update',
      'appointments.create', 'appointments.read', 'appointments.update',
      'transactions.create', 'transactions.read', 'transactions.update',
      'reports.read'
    ],
    receptionist: [
      'customers.create', 'customers.read', 'customers.update',
      'appointments.create', 'appointments.read', 'appointments.update',
      'transactions.create', 'transactions.read', 'transactions.update'
    ],
    therapist: [
      'appointments.read', // Only their own appointments
      'customers.read' // Read-only for customer info during appointments
    ]
  }

  const hasPermission = (permission: string): boolean => {
    if (!userRole) return false
    return permissions[userRole as keyof typeof permissions]?.includes(permission) || false
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Reset state
      setUser(null)
      setSession(null)
      setUserRole(null)
      setUserFullName(null)

      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out.",
        variant: "destructive",
      })
    }
  }

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) throw error

      setSession(session)
      if (session?.user) {
        setUser(session.user)
      }
    } catch (error: any) {
      console.error('Error refreshing session:', error)
    }
  }

  // Fetch user profile from our database
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('Error fetching user profile:', userError)
        return
      }

      if (userData) {
        setUserRole(userData.role)
        setUserFullName(`${userData.first_name} ${userData.last_name}`)

        // Store role in JWT claims for RLS
        if (session) {
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              role: userData.role,
              user_id: userId
            }
          })

          if (updateError) {
            console.error('Error updating user claims:', updateError)
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }

        if (session?.user) {
          setUser(session.user)
          setSession(session)
          await fetchUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)

        if (session?.user) {
          setUser(session.user)
          setSession(session)
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setSession(null)
          setUserRole(null)
          setUserFullName(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    user,
    session,
    userRole,
    userFullName,
    loading,
    signOut,
    refreshSession,
    hasPermission
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}