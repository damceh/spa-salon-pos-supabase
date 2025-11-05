import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Clock, User, Phone, Mail, Plus, Search, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, addMinutes, isBefore, isAfter, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { spaConfig, formatTime, formatCurrency } from '@/config/spa-config'
import type { Therapist, Service, Customer, Appointment } from '@/lib/supabase'

const bookingSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  therapist_id: z.string().min(1, 'Therapist is required'),
  service_id: z.string().min(1, 'Service is required'),
  date: z.date().min(new Date(), 'Date must be in the future'),
  time: z.string().min(1, 'Time is required'),
  notes: z.string().optional()
})

const customerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone number is required')
})

type BookingFormData = z.infer<typeof bookingSchema>
type CustomerFormData = z.infer<typeof customerSchema>

interface BookingModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
  therapists: Therapist[]
  services: Service[]
  selectedSlot?: { therapistId: string; startTime: Date } | null
  selectedAppointment?: Appointment | null
}

export function BookingModal({
  open,
  onClose,
  onComplete,
  therapists,
  services,
  selectedSlot,
  selectedAppointment
}: BookingModalProps) {
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Date[]>([])
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)

  const { toast } = useToast()

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customer_id: '',
      therapist_id: selectedSlot?.therapistId || '',
      service_id: '',
      date: selectedSlot?.startTime || new Date(),
      time: selectedSlot ? format(selectedSlot.startTime, 'HH:mm') : '',
      notes: ''
    }
  })

  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    }
  })

  // Load existing customers
  useEffect(() => {
    loadCustomers()
  }, [])

  // Pre-fill form if editing existing appointment
  useEffect(() => {
    if (selectedAppointment) {
      const startTime = new Date(selectedAppointment.start_time)
      form.reset({
        customer_id: selectedAppointment.customer_id,
        therapist_id: selectedAppointment.therapist_id,
        service_id: selectedAppointment.service_id,
        date: startTime,
        time: format(startTime, 'HH:mm'),
        notes: selectedAppointment.notes || ''
      })

      // Find and set the selected service
      const service = services.find(s => s.id === selectedAppointment.service_id)
      setSelectedService(service || null)
    }
  }, [selectedAppointment, form, services])

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('last_name, first_name')
        .limit(50)

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    setSelectedService(service || null)

    // Generate available time slots based on service duration
    if (service) {
      generateTimeSlots(form.getValues('date'), form.getValues('therapist_id'), service.duration_minutes)
    }
  }

  const handleDateChange = (date: Date) => {
    form.setValue('date', date)
    const serviceId = form.getValues('service_id')
    const therapistId = form.getValues('therapist_id')
    const service = services.find(s => s.id === serviceId)

    if (service && therapistId) {
      generateTimeSlots(date, therapistId, service.duration_minutes)
    }
  }

  const handleTherapistChange = (therapistId: string) => {
    form.setValue('therapist_id', therapistId)
    const serviceId = form.getValues('service_id')
    const service = services.find(s => s.id === serviceId)

    if (service) {
      generateTimeSlots(form.getValues('date'), therapistId, service.duration_minutes)
    }
  }

  const generateTimeSlots = async (date: Date, therapistId: string, duration: number) => {
    try {
      const startTime = new Date(date)
      startTime.setHours(spaConfig.timeSlots.startHour, 0, 0, 0)

      const endTime = new Date(date)
      endTime.setHours(spaConfig.timeSlots.endHour, 0, 0, 0)

      const slots = []
      const currentTime = new Date(startTime)

      while (isBefore(currentTime, endTime)) {
        const slotEnd = addMinutes(currentTime, duration)
        if (isBefore(slotEnd, endTime)) {
          slots.push(new Date(currentTime))
        }
        currentTime.setTime(currentTime.getTime() + spaConfig.timeSlots.duration * 60000)
      }

      // Check for conflicts with existing appointments
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('therapist_id', therapistId)
        .eq('status', 'scheduled')
        .gte('start_time', format(startTime, 'yyyy-MM-dd HH:mm:ss'))
        .lt('start_time', format(endTime, 'yyyy-MM-dd HH:mm:ss'))

      if (error) throw error

      const availableSlots = slots.filter(slot => {
        const slotEnd = addMinutes(slot, duration)
        return !existingAppointments?.some(apt => {
          const aptStart = new Date(apt.start_time)
          const aptEnd = new Date(apt.end_time)
          return (isBefore(slot, aptEnd) && isAfter(slotEnd, aptStart))
        })
      })

      setAvailableTimeSlots(availableSlots)
      setConflictMessage(null)

      if (availableSlots.length === 0) {
        setConflictMessage('No available time slots for this service duration')
      }

    } catch (error) {
      console.error('Error generating time slots:', error)
      setConflictMessage('Error checking availability')
    }
  }

  const handleCreateCustomer = async (data: CustomerFormData) => {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone: data.phone
        })
        .select()
        .single()

      if (error) throw error

      setCustomers(prev => [customer, ...prev])
      form.setValue('customer_id', customer.id)
      setShowAddCustomer(false)
      customerForm.reset()

      toast({
        title: "Customer Created",
        description: `${customer.first_name} ${customer.last_name} has been added.`,
      })

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (data: BookingFormData) => {
    if (!selectedService) {
      toast({
        title: "Error",
        description: "Please select a service",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setConflictMessage(null)

    try {
      // Combine date and time
      const [hours, minutes] = data.time.split(':').map(Number)
      const startTime = new Date(data.date)
      startTime.setHours(hours, minutes, 0, 0)

      const endTime = addMinutes(startTime, selectedService.duration_minutes)

      let result

      if (selectedAppointment) {
        // Update existing appointment
        const { data: updated, error } = await supabase
          .from('appointments')
          .update({
            customer_id: data.customer_id,
            therapist_id: data.therapist_id,
            service_id: data.service_id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            notes: data.notes,
            total_price: selectedService.base_price
          })
          .eq('id', selectedAppointment.id)
          .select()
          .single()

        if (error) throw error
        result = updated

      } else {
        // Create new appointment
        const { data: created, error } = await supabase
          .from('appointments')
          .insert({
            customer_id: data.customer_id,
            therapist_id: data.therapist_id,
            service_id: data.service_id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            notes: data.notes,
            total_price: selectedService.base_price,
            status: 'scheduled'
          })
          .select()
          .single()

        if (error) throw error
        result = created
      }

      toast({
        title: selectedAppointment ? "Appointment Updated" : "Appointment Created",
        description: `Successfully scheduled for ${format(startTime, 'MMM d, yyyy')} at ${formatTime(startTime)}.`,
      })

      onComplete()

    } catch (error: any) {
      console.error('Booking error:', error)

      if (error.message?.includes('overlapping')) {
        setConflictMessage('This time slot conflicts with another appointment')
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to save appointment",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer =>
    `${customer.first_name} ${customer.last_name} ${customer.email || ''} ${customer.phone || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  const totalPrice = selectedService?.base_price || 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedAppointment ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
          <DialogDescription>
            {selectedAppointment ? 'Update appointment details' : 'Schedule a new appointment for a customer'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Customer</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCustomer(!showAddCustomer)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Customer
                </Button>
              </div>

              {showAddCustomer ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add New Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={customerForm.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="First name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={customerForm.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={customerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Email (optional)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={customerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        onClick={customerForm.handleSubmit(handleCreateCustomer)}
                        disabled={loading}
                      >
                        Add Customer
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddCustomer(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredCustomers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                <div>
                                  <div className="font-medium">
                                    {customer.first_name} {customer.last_name}
                                  </div>
                                  {customer.email && (
                                    <div className="text-sm text-muted-foreground">
                                      {customer.email}
                                    </div>
                                  )}
                                  {customer.phone && (
                                    <div className="text-sm text-muted-foreground">
                                      {customer.phone}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Service and Therapist */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value)
                      handleServiceChange(value)
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div>
                              <div className="font-medium">{service.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {service.duration_minutes} min • {formatCurrency(service.base_price)}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="therapist_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Therapist</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value)
                      handleTherapistChange(value)
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select therapist" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {therapists.map((therapist) => (
                          <SelectItem key={therapist.id} value={therapist.id}>
                            <div>
                              <div className="font-medium">
                                {therapist.first_name} {therapist.last_name}
                              </div>
                              {therapist.specialties && therapist.specialties.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  {therapist.specialties.slice(0, 2).join(', ')}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date)
                              handleDateChange(date)
                            }
                          }}
                          disabled={(date) => isBefore(date, new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableTimeSlots.length > 0 ? (
                          availableTimeSlots.map((slot, index) => (
                            <SelectItem key={index} value={format(slot, 'HH:mm')}>
                              {formatTime(slot)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            {conflictMessage || 'No available slots'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {conflictMessage && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {conflictMessage}
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special requirements or notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price Summary */}
            {selectedService && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Price:</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                  {selectedService.name && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedService.name} ({selectedService.duration_minutes} minutes)
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || availableTimeSlots.length === 0}>
                {loading ? 'Saving...' : selectedAppointment ? 'Update' : 'Create'} Appointment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}