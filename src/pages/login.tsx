import React from 'react'
import { Link } from 'react-router-dom'
import { LoginForm } from '@/components/auth/login-form'
import { useAuth } from '@/contexts/auth-context'
import { Navigate } from 'react-router-dom'
import { spaConfig } from '@/config/spa-config'

export function LoginPage() {
  const { user, loading } = useAuth()

  // Redirect if already authenticated
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="text-2xl font-bold text-primary">
                {spaConfig.businessName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Point of Sale & Management System
              </p>
            </Link>
          </div>

          <LoginForm />

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Need help? Contact your system administrator
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Branding/Image */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-lg mx-auto px-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground">
                Welcome to {spaConfig.businessName}
              </h2>
              <p className="text-lg text-muted-foreground">
                Your complete spa and salon management solution
              </p>
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-muted-foreground">Real-time scheduling</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-muted-foreground">Point of sale system</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-muted-foreground">Customer management</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-muted-foreground">Inventory tracking</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-muted-foreground">Analytics & reporting</span>
              </div>
            </div>

            <div className="pt-8 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                Secure, reliable, and built for your spa business
              </p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  )
}