export const spaConfig = {
  businessName: "Serenity Spa & Salon",
  tagline: "Your Wellness Journey Begins Here",

  // Contact information
  contact: {
    phone: "+1 (555) 123-4567",
    email: "contact@serenityspa.com",
    address: "123 Wellness Way, Relaxation City, RC 12345"
  },

  // Business hours
  businessHours: {
    monday: { open: "09:00", close: "20:00", closed: false },
    tuesday: { open: "09:00", close: "20:00", closed: false },
    wednesday: { open: "09:00", close: "20:00", closed: false },
    thursday: { open: "09:00", close: "20:00", closed: false },
    friday: { open: "09:00", close: "20:00", closed: false },
    saturday: { open: "08:00", close: "18:00", closed: false },
    sunday: { open: "10:00", close: "17:00", closed: false }
  },

  // Time slot configuration
  timeSlots: {
    duration: 15, // minutes
    startHour: 8,
    endHour: 21,
    bufferTime: 15 // minutes between appointments
  },

  // Tax configuration
  tax: {
    rate: 0.08, // 8% tax rate
    included: false // Whether prices include tax
  },

  // Appointment settings
  appointments: {
    maxAdvanceBooking: 90, // days
    minAdvanceBooking: 1, // day
    cancellationPeriod: 24, // hours
    noShowPeriod: 4 // hours
  },

  // Payment methods accepted
  paymentMethods: [
    { id: 'cash', name: 'Cash', enabled: true },
    { id: 'card', name: 'Credit/Debit Card', enabled: true },
    { id: 'mobile_payment', name: 'Mobile Payment', enabled: false },
    { id: 'bank_transfer', name: 'Bank Transfer', enabled: false },
    { id: 'other', name: 'Other', enabled: true }
  ],

  // Features configuration
  features: {
    onlineBooking: false, // Customer-facing booking
    emailReminders: false, // Email appointment reminders
    smsReminders: false,   // SMS appointment reminders
    giftCards: true,       // Gift card functionality
    memberships: false,    // Membership management
    packages: true,        // Service packages
    products: true,        // Retail products
    tips: true,           // Tipping functionality
    reports: true,        // Analytics and reporting
    inventory: true       // Inventory management
  },

  // UI Settings
  ui: {
    theme: 'default',
    colors: {
      primary: '#10b981',
      secondary: '#6366f1',
      accent: '#f59e0b'
    },
    currency: {
      symbol: '$',
      code: 'USD',
      position: 'before' // 'before' or 'after'
    }
  },

  // Localization
  locale: {
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h' // '12h' or '24h'
  }
}

// Helper functions
export const formatCurrency = (amount: number): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: spaConfig.ui.currency.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return formatter.format(amount)
}

export const formatTime = (time: string | Date): string => {
  const date = typeof time === 'string' ? new Date(`2000-01-01T${time}`) : time
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: spaConfig.locale.timeFormat === '12h'
  }
  return date.toLocaleTimeString('en-US', options)
}

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  return d.toLocaleDateString('en-US', options)
}

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: spaConfig.locale.timeFormat === '12h'
  }
  return d.toLocaleDateString('en-US', options)
}

export const isBusinessOpen = (date: Date = new Date()): boolean => {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  const dayHours = spaConfig.businessHours[dayName as keyof typeof spaConfig.businessHours]

  if (dayHours?.closed) return false

  const currentHour = date.getHours()
  const currentMinutes = date.getMinutes()
  const currentTime = currentHour * 60 + currentMinutes

  const [openHour, openMinute] = dayHours?.open.split(':').map(Number) || [9, 0]
  const [closeHour, closeMinute] = dayHours?.close.split(':').map(Number) || [20, 0]

  const openTime = openHour * 60 + openMinute
  const closeTime = closeHour * 60 + closeMinute

  return currentTime >= openTime && currentTime <= closeTime
}