import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setError(null)

    try {
      // Step 1: Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (authError) {
        throw authError
      }

      if (!authData.user || !authData.session) {
        throw new Error('Authentication failed')
      }

      // Step 2: Check if user exists in our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role, is_active')
        .eq('id', authData.user.id)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        throw new Error('User profile not found')
      }

      if (!userData.is_active) {
        throw new Error('Account is deactivated')
      }

      // Step 3: Update user metadata for RLS
      await supabase.auth.updateUser({
        data: {
          role: userData.role,
          user_id: userData.id
        }
      })

      toast({
        title: "Welcome Back!",
        description: "You have been successfully signed in.",
      })

      // Redirect based on role
      switch (userData.role) {
        case 'super_admin':
        case 'manager':
          navigate('/admin/dashboard')
          break
        case 'receptionist':
        case 'therapist':
          navigate('/dashboard')
          break
        default:
          navigate('/dashboard')
      }

      onSuccess?.()

    } catch (error: any) {
      console.error('Login error:', error)

      let errorMessage = 'An unexpected error occurred'
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please try again later'
        } else if (error.message.includes('Account is deactivated')) {
          errorMessage = 'Your account has been deactivated'
        } else if (error.message.includes('User profile not found')) {
          errorMessage = 'User profile not found. Please contact administrator'
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!form.getValues('email')) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        form.getValues('email'),
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      )

      if (error) throw error

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for password reset instructions.",
      })

    } catch (error: any) {
      console.error('Password reset error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access the Spa & Salon POS system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      autoComplete="email"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={loading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
          <Button
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={handleForgotPassword}
            disabled={loading}
          >
            Forgot your password?
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}