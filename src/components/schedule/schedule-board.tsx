import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { addDays, startOfWeek, format, isSameDay, isToday, setHours, setMinutes } from 'date-fns'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar, ChevronLeft, ChevronRight, Users, Clock, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ScheduleGrid } from './schedule-grid'
import { AppointmentCard } from './appointment-card'
import { BookingModal } from './booking-modal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { spaConfig, formatTime } from '@/config/spa-config'
import type { Therapist, Appointment, Service } from '@/lib/supabase'

interface ScheduleBoardProps {
  date?: Date
  onDateChange?: (date: Date) => void
}

export function ScheduleBoard({ date: initialDate = new Date(), onDateChange }: ScheduleBoardProps) {
  const [currentDate, setCurrentDate] = useState(initialDate)
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ therapistId: string; startTime: Date } | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const { user, hasPermission } = useAuth()
  const { toast } = useToast()

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = []
    const { startHour, endHour, duration } = spaConfig.timeSlots

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += duration) {
        const time = setMinutes(setHours(currentDate, hour), minute)
        slots.push(time)
      }
    }
    return slots
  }, [currentDate])

  // Generate week dates
  const weekDates = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [therapistsRes, appointmentsRes, servicesRes] = await Promise.all([
        supabase
          .from('therapist_details')
          .select('*')
          .eq('user_active', true)
          .eq('is_available', true)
          .order('last_name, first_name'),

        supabase
          .from('appointment_details')
          .select('*')
          .gte('start_time', format(weekDates[0], 'yyyy-MM-dd'))
          .lte('start_time', format(weekDates[6], 'yyyy-MM-dd'))
          .not('status', 'in', '("cancelled", "no_show")')
          .order('start_time'),

        supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ])

      if (therapistsRes.error) throw therapistsRes.error
      if (appointmentsRes.error) throw appointmentsRes.error
      if (servicesRes.error) throw servicesRes.error

      setTherapists(therapistsRes.data || [])
      setAppointments(appointmentsRes.data || [])
      setServices(servicesRes.data || [])

    } catch (error) {
      console.error('Error loading schedule data:', error)
      toast({
        title: "Error",
        description: "Failed to load schedule data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [currentDate, weekDates, toast])

  // Set up real-time subscriptions
  useEffect(() => {
    loadData()

    // Subscribe to appointments changes
    const appointmentsSubscription = supabase
      .channel('appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('Appointment change:', payload)
          loadData() // Reload data for real-time updates
        }
      )
      .subscribe()

    // Subscribe to therapist schedule changes
    const therapistScheduleSubscription = supabase
      .channel('therapist_schedules')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'therapist_schedules'
        },
        (payload) => {
          console.log('Therapist schedule change:', payload)
          loadData() // Reload data
        }
      )
      .subscribe()

    return () => {
      appointmentsSubscription.unsubscribe()
      therapistScheduleSubscription.unsubscribe()
    }
  }, [loadData])

  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
    onDateChange?.(date)
  }

  const navigatePrevious = () => {
    handleDateChange(addDays(currentDate, -7))
  }

  const navigateNext = () => {
    handleDateChange(addDays(currentDate, 7))
  }

  const handleToday = () => {
    handleDateChange(new Date())
  }

  const handleTimeSlotClick = (therapistId: string, time: Date) => {
    if (!hasPermission('appointments.create')) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create appointments",
        variant: "destructive",
      })
      return
    }

    setSelectedSlot({ therapistId, startTime: time })
    setBookingModalOpen(true)
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    if (!hasPermission('appointments.read')) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to view appointments",
        variant: "destructive",
      })
      return
    }

    setSelectedAppointment(appointment)
    setBookingModalOpen(true)
  }

  const handleBookingComplete = () => {
    setBookingModalOpen(false)
    setSelectedSlot(null)
    setSelectedAppointment(null)
    loadData() // Refresh data
    toast({
      title: "Success",
      description: selectedAppointment
        ? "Appointment updated successfully"
        : "Appointment created successfully",
    })
  }

  const getAppointmentForSlot = (therapistId: string, time: Date): Appointment | null => {
    return appointments.find(apt => {
      const aptStartTime = new Date(apt.start_time)
      const aptEndTime = new Date(apt.end_time)
      return apt.therapist_id === therapistId &&
             time >= aptStartTime &&
             time < aptEndTime
    }) || null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'no_show': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading schedule...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold">Therapist Schedule</h2>
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(currentDate, 'MMMM d, yyyy')}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={navigatePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Week
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
            >
              Today
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={navigateNext}
            >
              Next Week
              <ChevronRight className="h-4 w-4" />
            </Button>

            {hasPermission('appointments.create') && (
              <Button
                onClick={() => {
                  setSelectedSlot(null)
                  setSelectedAppointment(null)
                  setBookingModalOpen(true)
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            )}
          </div>
        </div>

        {/* Week Overview */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, index) => {
            const dayName = format(date, 'EEE')
            const dayNumber = format(date, 'd')
            const isCurrentDay = isToday(date)
            const dayAppointments = appointments.filter(apt =>
              isSameDay(new Date(apt.start_time), date)
            )

            return (
              <div
                key={index}
                className={`
                  text-center p-3 rounded-lg border-2 transition-colors cursor-pointer
                  ${isCurrentDay
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/20'
                  }
                `}
                onClick={() => handleDateChange(date)}
              >
                <div className="font-medium text-sm">{dayName}</div>
                <div className={`text-2xl font-bold mt-1 ${isCurrentDay ? 'text-primary' : ''}`}>
                  {dayNumber}
                </div>
                {dayAppointments.length > 0 && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {dayAppointments.length} appointments
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Main Schedule Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Schedule for {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Time slots: {spaConfig.timeSlots.duration} minutes
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full">
              <div className="min-w-[800px]">
                {/* Time header */}
                <div className="sticky top-0 z-10 bg-background border-b">
                  <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(120px,1fr))] gap-1">
                    <div className="p-2 font-medium text-sm border-r">
                      Therapist / Time
                    </div>
                    {timeSlots.map((time, index) => (
                      <div
                        key={index}
                        className="p-2 text-center text-xs font-medium border-r"
                      >
                        {formatTime(time)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule rows */}
                {therapists.map((therapist) => (
                  <div key={therapist.id} className="border-b last:border-b-0">
                    <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(120px,1fr))] gap-1">
                      {/* Therapist name */}
                      <div className="p-3 font-medium border-r bg-muted/50">
                        <div>{therapist.first_name} {therapist.last_name}</div>
                        {therapist.specialties && therapist.specialties.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {therapist.specialties.slice(0, 2).join(', ')}
                            {therapist.specialties.length > 2 && '...'}
                          </div>
                        )}
                      </div>

                      {/* Time slots */}
                      {timeSlots.map((time, timeIndex) => {
                        const appointment = getAppointmentForSlot(therapist.id, time)
                        const isAppointmentStart = appointment &&
                          new Date(appointment.start_time).getTime() === time.getTime()

                        return (
                          <div
                            key={timeIndex}
                            className={`
                              min-h-[60px] border-r border-b relative group cursor-pointer
                              ${appointment ? 'bg-primary/5' : 'hover:bg-muted/20'}
                            `}
                            onClick={() => {
                              if (appointment && isAppointmentStart) {
                                handleAppointmentClick(appointment)
                              } else if (!appointment) {
                                handleTimeSlotClick(therapist.id, time)
                              }
                            }}
                          >
                            {appointment && isAppointmentStart && (
                              <AppointmentCard
                                appointment={appointment}
                                className="absolute inset-1 z-10"
                                compact={true}
                              />
                            )}

                            {!appointment && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={!hasPermission('appointments.create')}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {therapists.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No therapists available for this time period</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Booking Modal */}
        {bookingModalOpen && (
          <BookingModal
            open={bookingModalOpen}
            onClose={() => {
              setBookingModalOpen(false)
              setSelectedSlot(null)
              setSelectedAppointment(null)
            }}
            onComplete={handleBookingComplete}
            therapists={therapists}
            services={services}
            selectedSlot={selectedSlot}
            selectedAppointment={selectedAppointment}
          />
        )}
      </div>
    </DndProvider>
  )
}