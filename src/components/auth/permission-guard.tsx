import React, { ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface PermissionGuardProps {
  children: ReactNode
  permissions: string | string[]
  requireAll?: boolean // If true, user must have ALL permissions. If false, ANY permission is sufficient
  fallback?: ReactNode
}

export function PermissionGuard({
  children,
  permissions,
  requireAll = false,
  fallback = null
}: PermissionGuardProps) {
  const { hasPermission } = useAuth()

  const permissionList = Array.isArray(permissions) ? permissions : [permissions]

  // Check if user has required permissions
  const hasRequiredPermission = requireAll
    ? permissionList.every(permission => hasPermission(permission))
    : permissionList.some(permission => hasPermission(permission))

  if (!hasRequiredPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RoleGuardProps {
  children: ReactNode
  roles: string | string[]
  fallback?: ReactNode
}

export function RoleGuard({ children, roles, fallback = null }: RoleGuardProps) {
  const { userRole } = useAuth()

  const roleList = Array.isArray(roles) ? roles : [roles]
  const hasRequiredRole = userRole && roleList.includes(userRole)

  if (!hasRequiredRole) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Hook-based permission checking
export function usePermissionGuard() {
  const { hasPermission, userRole } = useAuth()

  const can = (permission: string) => hasPermission(permission)

  const canAny = (permissions: string[]) =>
    permissions.some(permission => hasPermission(permission))

  const canAll = (permissions: string[]) =>
    permissions.every(permission => hasPermission(permission))

  const isRole = (role: string) => userRole === role

  const isAnyRole = (roles: string[]) =>
    userRole && roles.includes(userRole)

  const isAdmin = () => ['super_admin', 'manager'].includes(userRole || '')

  const isSuperAdmin = () => userRole === 'super_admin'

  const isStaff = () => ['super_admin', 'manager', 'receptionist', 'therapist'].includes(userRole || '')

  return {
    can,
    canAny,
    canAll,
    isRole,
    isAnyRole,
    isAdmin,
    isSuperAdmin,
    isStaff,
    userRole
  }
}