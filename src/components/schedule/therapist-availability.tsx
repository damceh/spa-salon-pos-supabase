import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, User, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, addDays, startOfWeek, isToday, isBefore, isAfter } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { formatTime } from '@/config/spa-config'
import type { Therapist, TherapistSchedule, TherapistTimeOff } from '@/lib/supabase'

const scheduleSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  is_available: z.boolean().default(true)
})

const timeOffSchema = z.object({
  therapist_id: z.string().min(1, 'Therapist is required'),
  start_date: z.date().min(new Date(), 'Start date must be today or in the future'),
  end_date: z.date(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  reason: z.string().optional()
}).refine(
  (data) => isBefore(data.start_date, data.end_date) || isToday(data.start_date) && format(data.start_date, 'yyyy-MM-dd') === format(data.end_date, 'yyyy-MM-dd'),
  {
    message: "End date must be after or same as start date",
    path: ["end_date"]
  }
).refine(
  (data) => {
    if (data.start_time && data.end_time) {
      return isBefore(new Date(`2000-01-01T${data.start_time}`), new Date(`2000-01-01T${data.end_time}`))
    }
    return true
  },
  {
    message: "End time must be after start time",
    path: ["end_time"]
  }
)

type ScheduleFormData = z.infer<typeof scheduleSchema>
type TimeOffFormData = z.infer<typeof timeOffSchema>

interface TherapistAvailabilityProps {
  therapistId?: string
  className?: string
}

export function TherapistAvailability({ therapistId, className }: TherapistAvailabilityProps) {
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [schedules, setSchedules] = useState<TherapistSchedule[]>([])
  const [timeOffRequests, setTimeOffRequests] = useState<TherapistTimeOff[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTherapist, setSelectedTherapist] = useState<string>(therapistId || '')
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<TherapistSchedule | null>(null)

  const { toast } = useToast()

  const scheduleForm = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      is_available: true
    }
  })

  const timeOffForm = useForm<TimeOffFormData>({
    resolver: zodResolver(timeOffSchema),
    defaultValues: {
      therapist_id: therapistId || '',
      start_date: new Date(),
      end_date: new Date(),
      start_time: '',
      end_time: '',
      reason: ''
    }
  })

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ]

  // Load data
  const loadData = async () => {
    setLoading(true)
    try {
      const [therapistsRes, schedulesRes, timeOffRes] = await Promise.all([
        supabase
          .from('therapist_details')
          .select('*')
          .eq('user_active', true)
          .order('last_name, first_name'),

        selectedTherapist
          ? supabase
              .from('therapist_schedules')
              .select('*')
              .eq('therapist_id', selectedTherapist)
              .order('day_of_week, start_time')
          : Promise.resolve({ data: [], error: null }),

        selectedTherapist
          ? supabase
              .from('therapist_time_off')
              .select('*, therapist:therapist_details(first_name, last_name)')
              .eq('therapist_id', selectedTherapist)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null })
      ])

      if (therapistsRes.error) throw therapistsRes.error
      if (schedulesRes.error) throw schedulesRes.error
      if (timeOffRes.error) throw timeOffRes.error

      setTherapists(therapistsRes.data || [])
      setSchedules(schedulesRes.data || [])
      setTimeOffRequests(timeOffRes.data || [])

    } catch (error) {
      console.error('Error loading availability data:', error)
      toast({
        title: "Error",
        description: "Failed to load availability data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedTherapist])

  useEffect(() => {
    if (therapistId) {
      setSelectedTherapist(therapistId)
    }
  }, [therapistId])

  const handleCreateSchedule = async (data: ScheduleFormData) => {
    try {
      const scheduleData = {
        therapist_id: selectedTherapist,
        ...data
      }

      const { error } = await supabase
        .from('therapist_schedules')
        .insert(scheduleData)

      if (error) throw error

      toast({
        title: "Schedule Added",
        description: "Work schedule has been added successfully.",
      })

      setScheduleDialogOpen(false)
      scheduleForm.reset()
      loadData()

    } catch (error: any) {
      console.error('Error creating schedule:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to add schedule",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTimeOff = async (data: TimeOffFormData) => {
    try {
      const timeOffData = {
        therapist_id: data.therapist_id,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        end_date: format(data.end_date, 'yyyy-MM-dd'),
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        reason: data.reason || null
      }

      const { error } = await supabase
        .from('therapist_time_off')
        .insert(timeOffData)

      if (error) throw error

      toast({
        title: "Time Off Requested",
        description: "Time off has been requested successfully.",
      })

      setTimeOffDialogOpen(false)
      timeOffForm.reset()
      loadData()

    } catch (error: any) {
      console.error('Error requesting time off:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to request time off",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('therapist_schedules')
        .delete()
        .eq('id', scheduleId)

      if (error) throw error

      toast({
        title: "Schedule Removed",
        description: "Work schedule has been removed.",
      })

      loadData()

    } catch (error: any) {
      console.error('Error deleting schedule:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove schedule",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTimeOff = async (timeOffId: string) => {
    try {
      const { error } = await supabase
        .from('therapist_time_off')
        .delete()
        .eq('id', timeOffId)

      if (error) throw error

      toast({
        title: "Time Off Removed",
        description: "Time off request has been removed.",
      })

      loadData()

    } catch (error: any) {
      console.error('Error deleting time off:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove time off",
        variant: "destructive",
      })
    }
  }

  const handleApproveTimeOff = async (timeOffId: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('therapist_time_off')
        .update({
          is_approved: approve,
          approved_by: null, // This would be the current user's ID
          updated_at: new Date().toISOString()
        })
        .eq('id', timeOffId)

      if (error) throw error

      toast({
        title: approve ? "Time Off Approved" : "Time Off Rejected",
        description: `Time off request has been ${approve ? 'approved' : 'rejected'}.`,
      })

      loadData()

    } catch (error: any) {
      console.error('Error updating time off:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update time off request",
        variant: "destructive",
      })
    }
  }

  const getDayName = (dayOfWeek: number) => {
    return daysOfWeek.find(d => d.value === dayOfWeek)?.label || 'Unknown'
  }

  const getAvailabilityStatus = (therapistId: string) => {
    const therapistSchedules = schedules.filter(s => s.therapist_id === therapistId)
    const todaySchedule = therapistSchedules.find(s => s.day_of_week === new Date().getDay())
    const isAvailableToday = todaySchedule?.is_available

    const currentTime = new Date()
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute

    const isWithinHours = todaySchedule && isAvailableToday ? (() => {
      const [startHour, startMinute] = todaySchedule.start_time.split(':').map(Number)
      const [endHour, endMinute] = todaySchedule.end_time.split(':').map(Number)
      const startTimeInMinutes = startHour * 60 + startMinute
      const endTimeInMinutes = endHour * 60 + endMinute
      return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes
    })() : false

    return {
      isAvailable: isAvailableToday && isWithinHours,
      schedule: todaySchedule
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Therapist Availability
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedTherapist} onValueChange={setSelectedTherapist}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select therapist">
                    {selectedTherapist && (() => {
                      const therapist = therapists.find(t => t.id === selectedTherapist)
                      return therapist ? `${therapist.first_name} ${therapist.last_name}` : 'Select therapist'
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {therapists.map((therapist) => (
                    <SelectItem key={therapist.id} value={therapist.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {therapist.first_name} {therapist.last_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTherapist && (
                <>
                  <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Schedule
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Work Schedule</DialogTitle>
                        <DialogDescription>
                          Add regular working hours for the selected therapist
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...scheduleForm}>
                        <form onSubmit={scheduleForm.handleSubmit(handleCreateSchedule)} className="space-y-4">
                          <FormField
                            control={scheduleForm.control}
                            name="day_of_week"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Day of Week</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {daysOfWeek.map((day) => (
                                      <SelectItem key={day.value} value={day.value.toString()}>
                                        {day.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={scheduleForm.control}
                              name="start_time"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Time</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={scheduleForm.control}
                              name="end_time"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Time</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={scheduleForm.control}
                            name="is_available"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel>Available</FormLabel>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">
                              Add Schedule
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={timeOffDialogOpen} onOpenChange={setTimeOffDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Request Time Off
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Time Off</DialogTitle>
                        <DialogDescription>
                          Request time off for vacation, sick leave, or other reasons
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...timeOffForm}>
                        <form onSubmit={timeOffForm.handleSubmit(handleUpdateTimeOff)} className="space-y-4">
                          <FormField
                            control={timeOffForm.control}
                            name="therapist_id"
                            defaultValue={selectedTherapist}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Therapist</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select therapist" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {therapists.map((therapist) => (
                                      <SelectItem key={therapist.id} value={therapist.id}>
                                        {therapist.first_name} {therapist.last_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={timeOffForm.control}
                              name="start_date"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Date</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      {...field}
                                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                      onChange={(e) => field.onChange(new Date(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={timeOffForm.control}
                              name="end_date"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Date</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      {...field}
                                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                      onChange={(e) => field.onChange(new Date(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={timeOffForm.control}
                              name="start_time"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Time (Optional)</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={timeOffForm.control}
                              name="end_time"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Time (Optional)</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={timeOffForm.control}
                            name="reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reason (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Reason for time off..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setTimeOffDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">
                              Request Time Off
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {selectedTherapist ? (
            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
                <TabsTrigger value="timeoff">Time Off</TabsTrigger>
              </TabsList>

              <TabsContent value="schedule" className="space-y-4">
                <div className="grid gap-4">
                  {daysOfWeek.map((day) => {
                    const daySchedules = schedules.filter(s => s.day_of_week === day.value)
                    const isToday = day.value === new Date().getDay()

                    return (
                      <div
                        key={day.value}
                        className={`
                          flex items-center justify-between p-4 border rounded-lg
                          ${isToday ? 'border-primary bg-primary/5' : 'border-border'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`font-medium ${isToday ? 'text-primary' : ''}`}>
                            {day.label}
                            {isToday && <Badge variant="secondary" className="ml-2">Today</Badge>}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {daySchedules.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {daySchedules.map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md"
                                >
                                  <Clock className="h-3 w-3" />
                                  <span className="text-sm">
                                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                  </span>
                                  <Badge variant={schedule.is_available ? "default" : "secondary"}>
                                    {schedule.is_available ? 'Available' : 'Unavailable'}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No schedule set</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="timeoff" className="space-y-4">
                {timeOffRequests.length > 0 ? (
                  <div className="space-y-3">
                    {timeOffRequests.map((timeOff) => (
                      <div key={timeOff.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {format(new Date(timeOff.start_date), 'MMM d, yyyy')} - {format(new Date(timeOff.end_date), 'MMM d, yyyy')}
                          </div>
                          {timeOff.start_time && timeOff.end_time && (
                            <div className="text-sm text-muted-foreground">
                              {formatTime(timeOff.start_time)} - {formatTime(timeOff.end_time)}
                            </div>
                          )}
                          {timeOff.reason && (
                            <div className="text-sm text-muted-foreground">
                              Reason: {timeOff.reason}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant={timeOff.is_approved ? "default" : "secondary"}>
                            {timeOff.is_approved ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Pending
                              </>
                            )}
                          </Badge>

                          {!timeOff.is_approved && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveTimeOff(timeOff.id, true)}
                                className="h-6 w-6 p-0 text-green-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveTimeOff(timeOff.id, false)}
                                className="h-6 w-6 p-0 text-red-600"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTimeOff(timeOff.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No time off requests</p>
                    <p className="text-sm">Use the "Request Time Off" button to add time off.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a therapist to view and manage their availability</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}