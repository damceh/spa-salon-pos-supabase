import React, { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: string | string[]
  requiredPermission?: string
  fallback?: ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, userRole, loading, hasPermission } = useAuth()
  const location = useLocation()

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Check role requirements
  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!userRole || !requiredRoles.includes(userRole)) {
      // Show fallback if provided, otherwise redirect to unauthorized page
      if (fallback) {
        return <>{fallback}</>
      }
      return <Navigate to="/unauthorized" replace />
    }
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (fallback) {
      return <>{fallback}</>
    }
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

// Higher-order component for protecting routes
export function withProtection<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Specific protected route components for different access levels
export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole={['super_admin', 'manager']} {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function SuperAdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="super_admin" {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function StaffRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole={['super_admin', 'manager', 'receptionist', 'therapist']} {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function TherapistRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole={['super_admin', 'manager', 'therapist']} {...props}>
      {children}
    </ProtectedRoute>
  )
}