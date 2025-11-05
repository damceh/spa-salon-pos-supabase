import React from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { format, addMinutes, isBefore, isAfter, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Appointment } from '@/lib/supabase'

interface DraggableAppointmentProps {
  appointment: Appointment
  onDrop: (appointment: Appointment, newStartTime: Date, therapistId: string) => void
  className?: string
  compact?: boolean
}

interface DragItem {
  type: string
  appointment: Appointment
  originalStartTime: Date
  originalTherapistId: string
}

export function DraggableAppointment({
  appointment,
  onDrop,
  className,
  compact = false
}: DraggableAppointmentProps) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'appointment',
      item: {
        appointment,
        originalStartTime: new Date(appointment.start_time),
        originalTherapistId: appointment.therapist_id
      } as DragItem,
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      }),
      canDrag: appointment.status === 'scheduled' // Only allow dragging scheduled appointments
    }),
    [appointment]
  )

  return (
    <div
      ref={drag}
      className={cn(
        'cursor-move transition-opacity',
        isDragging && 'opacity-50',
        className
      )}
      style={{
        opacity: isDragging ? 0.5 : 1
      }}
    >
      <div className="h-full">
        {compact ? (
          <div className="p-1 text-xs border rounded bg-primary/10 border-primary/30">
            <div className="font-medium truncate">{appointment.customer_name}</div>
            <div className="text-muted-foreground truncate">
              {appointment.service_name}
            </div>
          </div>
        ) : (
          <div className="p-2 border rounded bg-primary/10 border-primary/30">
            <div className="font-medium">{appointment.customer_name}</div>
            <div className="text-sm text-muted-foreground">
              {appointment.service_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(appointment.start_time), 'HH:mm')} -
              {format(new Date(appointment.end_time), 'HH:mm')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface DroppableTimeSlotProps {
  therapistId: string
  time: Date
  onDrop: (appointment: Appointment, newStartTime: Date, therapistId: string) => void
  children?: React.ReactNode
  className?: string
  disabled?: boolean
}

export function DroppableTimeSlot({
  therapistId,
  time,
  onDrop,
  children,
  className,
  disabled = false
}: DroppableTimeSlotProps) {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: 'appointment',
      drop: (item: DragItem) => {
        onDrop(item.appointment, time, therapistId)
      },
      canDrop: (item: DragItem) => {
        if (disabled) return false

        // Check if it's the same appointment and same position
        if (
          item.appointment.id === item.appointment.id &&
          item.originalTherapistId === therapistId &&
          isSameDay(item.originalStartTime, time) &&
          Math.abs(item.originalStartTime.getTime() - time.getTime()) < 60000
        ) {
          return false
        }

        // Check if the time slot is in the past
        if (isBefore(time, new Date())) {
          return false
        }

        // Additional validation could be added here
        return true
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop()
      })
    }),
    [therapistId, time, disabled]
  )

  return (
    <div
      ref={drop}
      className={cn(
        'relative transition-colors',
        isOver && canDrop && 'bg-green-100 border-green-300',
        isOver && !canDrop && 'bg-red-100 border-red-300',
        canDrop && !isOver && 'border-2 border-dashed border-muted-foreground/20',
        className
      )}
    >
      {children}
      {isOver && canDrop && (
        <div className="absolute inset-0 bg-green-200 opacity-30 pointer-events-none" />
      )}
      {isOver && !canDrop && (
        <div className="absolute inset-0 bg-red-200 opacity-30 pointer-events-none" />
      )}
    </div>
  )
}

// Hook for handling appointment drag and drop with validation
export function useAppointmentDropHandler() {
  const { toast } = useToast()

  const handleDrop = async (
    appointment: Appointment,
    newStartTime: Date,
    newTherapistId: string
  ) => {
    try {
      // Calculate new end time based on service duration
      const { data: serviceData } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', appointment.service_id)
        .single()

      if (!serviceData) {
        throw new Error('Service not found')
      }

      const newEndTime = addMinutes(newStartTime, serviceData.duration_minutes)

      // Check for conflicts
      const { data: conflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('id')
        .eq('therapist_id', newTherapistId)
        .eq('status', 'scheduled')
        .neq('id', appointment.id)
        .or(`start_time.lte.${newEndTime.toISOString()},end_time.gte.${newStartTime.toISOString()}`)

      if (conflictError) throw conflictError

      if (conflicts && conflicts.length > 0) {
        throw new Error('Time slot conflicts with another appointment')
      }

      // Update the appointment
      const { data: updatedAppointment, error: updateError } = await supabase
        .from('appointments')
        .update({
          therapist_id: newTherapistId,
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id)
        .select()
        .single()

      if (updateError) throw updateError

      toast({
        title: "Appointment Moved",
        description: `Successfully rescheduled to ${format(newStartTime, 'MMM d, yyyy')} at ${format(newStartTime, 'HH:mm')}.`,
      })

      return updatedAppointment

    } catch (error: any) {
      console.error('Error updating appointment:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule appointment",
        variant: "destructive",
      })
      throw error
    }
  }

  return { handleDrop }
}