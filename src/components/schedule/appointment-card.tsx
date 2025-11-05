import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format, formatDuration, intervalToDuration } from 'date-fns'
import { Calendar, Clock, User, Phone, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { spaConfig, formatTime, formatDateTime } from '@/config/spa-config'
import type { Appointment } from '@/lib/supabase'

interface AppointmentCardProps {
  appointment: Appointment
  className?: string
  compact?: boolean
  onEdit?: (appointment: Appointment) => void
  onDelete?: (appointment: Appointment) => void
  onCancel?: (appointment: Appointment) => void
  onComplete?: (appointment: Appointment) => void
  onReschedule?: (appointment: Appointment) => void
}

export function AppointmentCard({
  appointment,
  className,
  compact = false,
  onEdit,
  onDelete,
  onCancel,
  onComplete,
  onReschedule
}: AppointmentCardProps) {
  const { hasPermission, userRole } = useAuth()

  const startTime = new Date(appointment.start_time)
  const endTime = new Date(appointment.end_time)
  const duration = intervalToDuration({ start: startTime, end: endTime })

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="h-3 w-3" />
      case 'in_progress': return <Clock className="h-3 w-3" />
      case 'completed': return null
      case 'cancelled': return null
      case 'no_show': return null
      default: return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled'
      case 'in_progress': return 'In Progress'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      case 'no_show': return 'No Show'
      default: return status
    }
  }

  const canEdit = hasPermission('appointments.update') ||
    (userRole === 'therapist' && appointment.therapist_id) // Therapist can edit their own appointments

  const canDelete = hasPermission('appointments.delete')

  const canCancel = hasPermission('appointments.update') ||
    (userRole === 'therapist' && appointment.therapist_id)

  const canComplete = hasPermission('appointments.update') ||
    (userRole === 'therapist' && appointment.therapist_id)

  const durationText = formatDuration(duration, {
    format: ['hours', 'minutes'],
    zero: false
  })

  const price = appointment.total_price || 0

  if (compact) {
    return (
      <Card className={cn(
        "cursor-pointer transition-all hover:shadow-md border-2",
        getStatusColor(appointment.status),
        className
      )}>
        <CardContent className="p-2 space-y-1">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm truncate">
              {appointment.customer_name}
            </div>
            <Badge variant="secondary" className="text-xs">
              {formatTime(startTime)}
            </Badge>
          </div>
          {appointment.service_name && (
            <div className="text-xs text-muted-foreground truncate">
              {appointment.service_name}
            </div>
          )}
          {durationText && (
            <div className="text-xs text-muted-foreground">
              {durationText}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      getStatusColor(appointment.status),
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(appointment.status)}>
                  {getStatusIcon(appointment.status)}
                  <span className="ml-1">{getStatusText(appointment.status)}</span>
                </Badge>
                <span className="text-sm font-medium">
                  {formatTime(startTime)} - {formatTime(endTime)}
                </span>
              </div>
              {durationText && (
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {durationText}
                </div>
              )}
            </div>

            {(canEdit || canDelete || canCancel) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit?.(appointment)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canReschedule && appointment.status === 'scheduled' && (
                    <DropdownMenuItem onClick={() => onReschedule?.(appointment)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Reschedule
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {canCancel && appointment.status === 'scheduled' && (
                    <DropdownMenuItem onClick={() => onCancel?.(appointment)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Cancel
                    </DropdownMenuItem>
                  )}
                  {canComplete && appointment.status === 'in_progress' && (
                    <DropdownMenuItem onClick={() => onComplete?.(appointment)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete?.(appointment)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Customer Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{appointment.customer_name}</div>
                {appointment.customer_email && (
                  <div className="text-sm text-muted-foreground">
                    {appointment.customer_email}
                  </div>
                )}
                {appointment.customer_phone && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {appointment.customer_phone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service Information */}
          {appointment.service_name && (
            <div className="space-y-1">
              <div className="font-medium">{appointment.service_name}</div>
              {appointment.service_description && (
                <div className="text-sm text-muted-foreground">
                  {appointment.service_description}
                </div>
              )}
              {price > 0 && (
                <div className="text-sm font-medium">
                  {spaConfig.ui.currency.symbol}{price.toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Therapist Information */}
          {appointment.therapist_name && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Therapist: {appointment.therapist_name}</span>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              <strong>Notes:</strong> {appointment.notes}
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground border-t pt-2">
            Created: {formatDateTime(appointment.created_at)}
            {appointment.updated_at !== appointment.created_at && (
              <div>Updated: {formatDateTime(appointment.updated_at)}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}