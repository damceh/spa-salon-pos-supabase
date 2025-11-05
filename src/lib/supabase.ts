import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types for our database
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          role: 'super_admin' | 'manager' | 'receptionist' | 'therapist'
          first_name: string
          last_name: string
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          role?: 'super_admin' | 'manager' | 'receptionist' | 'therapist'
          first_name: string
          last_name: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          role?: 'super_admin' | 'manager' | 'receptionist' | 'therapist'
          first_name?: string
          last_name?: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      therapists: {
        Row: {
          id: string
          user_id: string
          employee_id: string
          specialties: string[]
          certifications: any
          hire_date: string | null
          hourly_rate: number | null
          commission_rate: number | null
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          employee_id: string
          specialties?: string[]
          certifications?: any
          hire_date?: string | null
          hourly_rate?: number | null
          commission_rate?: number | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          employee_id?: string
          specialties?: string[]
          certifications?: any
          hire_date?: string | null
          hourly_rate?: number | null
          commission_rate?: number | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      service_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          category_id: string | null
          name: string
          description: string | null
          duration_minutes: number
          base_price: number
          is_active: boolean
          requires_therapist: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          description?: string | null
          duration_minutes: number
          base_price: number
          is_active?: boolean
          requires_therapist?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          duration_minutes?: number
          base_price?: number
          is_active?: boolean
          requires_therapist?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          sku: string | null
          unit_price: number
          cost_price: number | null
          stock_quantity: number
          reorder_level: number
          is_active: boolean
          is_taxable: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sku?: string | null
          unit_price: number
          cost_price?: number | null
          stock_quantity?: number
          reorder_level?: number
          is_active?: boolean
          is_taxable?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sku?: string | null
          unit_price?: number
          cost_price?: number | null
          stock_quantity?: number
          reorder_level?: number
          is_active?: boolean
          is_taxable?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          date_of_birth: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          customer_id: string
          therapist_id: string
          service_id: string
          start_time: string
          end_time: string
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          notes: string | null
          total_price: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          therapist_id: string
          service_id: string
          start_time: string
          end_time: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          notes?: string | null
          total_price?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          therapist_id?: string
          service_id?: string
          start_time?: string
          end_time?: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          notes?: string | null
          total_price?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          customer_id: string | null
          appointment_id: string | null
          staff_id: string
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          status: 'pending' | 'paid' | 'refunded' | 'partially_refunded'
          payment_method: 'cash' | 'card' | 'mobile_payment' | 'bank_transfer' | 'other' | null
          payment_reference: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          appointment_id?: string | null
          staff_id: string
          subtotal: number
          tax_amount?: number
          discount_amount?: number
          total_amount: number
          status?: 'pending' | 'paid' | 'refunded' | 'partially_refunded'
          payment_method?: 'cash' | 'card' | 'mobile_payment' | 'bank_transfer' | 'other' | null
          payment_reference?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          appointment_id?: string | null
          staff_id?: string
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          status?: 'pending' | 'paid' | 'refunded' | 'partially_refunded'
          payment_method?: 'cash' | 'card' | 'mobile_payment' | 'bank_transfer' | 'other' | null
          payment_reference?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transaction_items: {
        Row: {
          id: string
          transaction_id: string
          service_id: string | null
          product_id: string | null
          quantity: number
          unit_price: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          service_id?: string | null
          product_id?: string | null
          quantity: number
          unit_price: number
          line_total: number
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          service_id?: string | null
          product_id?: string | null
          quantity?: number
          unit_price?: number
          line_total?: number
          created_at?: string
        }
      }
      therapist_schedules: {
        Row: {
          id: string
          therapist_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          therapist_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          therapist_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      therapist_time_off: {
        Row: {
          id: string
          therapist_id: string
          start_date: string
          end_date: string
          start_time: string | null
          end_time: string | null
          reason: string | null
          is_approved: boolean
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          therapist_id: string
          start_date: string
          end_date: string
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          is_approved?: boolean
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          therapist_id?: string
          start_date?: string
          end_date?: string
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          is_approved?: boolean
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      webhook_configurations: {
        Row: {
          id: string
          name: string
          url: string
          secret_key: string | null
          events: ('appointment.created' | 'appointment.updated' | 'appointment.completed' | 'appointment.cancelled' | 'payment.created' | 'payment.completed' | 'customer.created' | 'customer.updated')[]
          is_active: boolean
          retry_count: number
          timeout_seconds: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          secret_key?: string | null
          events: ('appointment.created' | 'appointment.updated' | 'appointment.completed' | 'appointment.cancelled' | 'payment.created' | 'payment.completed' | 'customer.created' | 'customer.updated')[]
          is_active?: boolean
          retry_count?: number
          timeout_seconds?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          secret_key?: string | null
          events?: ('appointment.created' | 'appointment.updated' | 'appointment.completed' | 'appointment.cancelled' | 'payment.created' | 'payment.completed' | 'customer.created' | 'customer.updated')[]
          is_active?: boolean
          retry_count?: number
          timeout_seconds?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      webhook_delivery_logs: {
        Row: {
          id: string
          webhook_id: string
          event_type: 'appointment.created' | 'appointment.updated' | 'appointment.completed' | 'appointment.cancelled' | 'payment.created' | 'payment.completed' | 'customer.created' | 'customer.updated'
          payload: any
          response_status: number | null
          response_body: string | null
          attempt_count: number
          status: string
          delivered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          webhook_id: string
          event_type: 'appointment.created' | 'appointment.updated' | 'appointment.completed' | 'appointment.cancelled' | 'payment.created' | 'payment.completed' | 'customer.created' | 'customer.updated'
          payload: any
          response_status?: number | null
          response_body?: string | null
          attempt_count?: number
          status?: string
          delivered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          webhook_id?: string
          event_type?: 'appointment.created' | 'appointment.updated' | 'appointment.completed' | 'appointment.cancelled' | 'payment.created' | 'payment.completed' | 'customer.created' | 'customer.updated'
          payload?: any
          response_status?: number | null
          response_body?: string | null
          attempt_count?: number
          status?: string
          delivered_at?: string | null
          created_at?: string
        }
      }
    }
  }
}

// Export type shortcuts
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']
export type Therapist = Database['public']['Tables']['therapists']['Row']
export type TherapistInsert = Database['public']['Tables']['therapists']['Insert']
export type TherapistUpdate = Database['public']['Tables']['therapists']['Update']
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']
export type Service = Database['public']['Tables']['services']['Row']
export type ServiceInsert = Database['public']['Tables']['services']['Insert']
export type ServiceUpdate = Database['public']['Tables']['services']['Update']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
export type AppointmentUpdate = Database['public']['Tables']['appointments']['Update']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
export type TransactionItem = Database['public']['Tables']['transaction_items']['Row']
export type TransactionItemInsert = Database['public']['Tables']['transaction_items']['Insert']
export type TherapistSchedule = Database['public']['Tables']['therapist_schedules']['Row']
export type TherapistTimeOff = Database['public']['Tables']['therapist_time_off']['Row']

// View types
export type TherapistDetails = {
  id: string
  user_id: string
  employee_id: string
  specialties: string[]
  certifications: any
  hire_date: string | null
  hourly_rate: number | null
  commission_rate: number | null
  is_available: boolean
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: string
  user_active: boolean
}

export type AppointmentDetails = {
  id: string
  customer_id: string
  therapist_id: string
  service_id: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  notes: string | null
  total_price: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  therapist_name: string | null
  service_name: string | null
  service_description: string | null
  duration_minutes: number | null
  base_price: number | null
}

export type TransactionDetails = {
  id: string
  customer_id: string | null
  appointment_id: string | null
  staff_id: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  status: 'pending' | 'paid' | 'refunded' | 'partially_refunded'
  payment_method: 'cash' | 'card' | 'mobile_payment' | 'bank_transfer' | 'other' | null
  payment_reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
  customer_name: string | null
  staff_name: string | null
  staff_role: string | null
}

// Cart interface (not stored in database)
export interface CartItem {
  id: string
  type: 'service' | 'product'
  service_id?: string
  product_id?: string
  service_name?: string
  product_name?: string
  quantity: number
  unit_price: number
  line_total: number
  created_at: string
}