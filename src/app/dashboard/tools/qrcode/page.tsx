"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { DateTimePicker } from "@/components/ui/date-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Download,
  Share2,
  AlertCircle,
  CheckCircle,
  Info,
  Link,
  Mail,
  Phone,
  Wifi,
  User,
  Calendar,
  MapPin,
  MessageSquare,
  Settings
} from "lucide-react"
import { toast } from "sonner"
import QRCode from 'qrcode'

type QRSize = 'small' | 'medium' | 'large'
type QRFormat = 'png' | 'jpg' | 'svg'
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'
type QRTemplate = 'text' | 'url' | 'email' | 'phone' | 'wifi' | 'vcard' | 'event' | 'location' | 'sms'
type FrameType = 'none' | 'square' | 'rounded' | 'dashed' | 'heart' | 'floral' | 'tech' | 'industrial' | 'geometric'

interface QRStats {
  version: number
  dataBits: number
  totalBits: number
  size: string
}

interface TemplateData {
  type: QRTemplate
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  fields: Array<{
    key: string
    label: string
    placeholder: string
    type: 'text' | 'email' | 'tel' | 'url' | 'password' | 'datetime-local' | 'date-picker'
    required: boolean
  }>
}

interface TemplateFormData {
  [key: string]: string
}

export default function QrCodeToolPage() {
  const [text, setText] = useState("")
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [qrStats, setQrStats] = useState<QRStats | null>(null)

  // Template selection and data
  const [selectedTemplate, setSelectedTemplate] = useState<QRTemplate>('text')
  const [templateFormData, setTemplateFormData] = useState<TemplateFormData>({})

  // Configuration options
  const [size, setSize] = useState<QRSize>('medium')
  const [format, setFormat] = useState<QRFormat>('png')
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<ErrorCorrectionLevel>('M')
  const [frameType, setFrameType] = useState<FrameType>('none')

  // Define templates
  const templates: TemplateData[] = [
    {
      type: 'text',
      label: 'Text',
      description: 'Simple text message',
      icon: MessageSquare,
      fields: [
        { key: 'text', label: 'Text', placeholder: 'Enter your message...', type: 'text', required: true }
      ]
    },
    {
      type: 'url',
      label: 'URL',
      description: 'Link to a website',
      icon: Link,
      fields: [
        { key: 'url', label: 'URL', placeholder: 'https://example.com', type: 'url', required: true }
      ]
    },
    {
      type: 'email',
      label: 'Email',
      description: 'Create link to send email',
      icon: Mail,
      fields: [
        { key: 'email', label: 'Email Address', placeholder: 'recipient@example.com', type: 'email', required: true },
        { key: 'subject', label: 'Subject', placeholder: 'Enter subject (optional)', type: 'text', required: false },
        { key: 'body', label: 'Message', placeholder: 'Enter message (optional)', type: 'text', required: false }
      ]
    },
    {
      type: 'phone',
      label: 'Phone',
      description: 'Direct dial phone number',
      icon: Phone,
      fields: [
        { key: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567', type: 'tel', required: true }
      ]
    },
    {
      type: 'wifi',
      label: 'WiFi',
      description: 'Share WiFi credentials',
      icon: Wifi,
      fields: [
        { key: 'ssid', label: 'Network Name (SSID)', placeholder: 'MyWiFiNetwork', type: 'text', required: true },
        { key: 'password', label: 'Password', placeholder: 'Enter password...', type: 'password', required: true },
        { key: 'encryption', label: 'Encryption Type', placeholder: 'WPA', type: 'text', required: false }
      ]
    },
    {
      type: 'vcard',
      label: 'vCard',
      description: 'Share contact information',
      icon: User,
      fields: [
        { key: 'name', label: 'Full Name', placeholder: 'John Doe', type: 'text', required: true },
        { key: 'company', label: 'Company', placeholder: 'Company Name', type: 'text', required: false },
        { key: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567', type: 'tel', required: false },
        { key: 'email', label: 'Email Address', placeholder: 'john@example.com', type: 'email', required: false },
        { key: 'website', label: 'Website', placeholder: 'https://website.com', type: 'url', required: false }
      ]
    },
    {
      type: 'event',
      label: 'Event',
      description: 'Share event details',
      icon: Calendar,
      fields: [
        { key: 'title', label: 'Event Title', placeholder: 'Meeting Title', type: 'text', required: true },
        { key: 'start', label: 'Start Date & Time', placeholder: '2024-01-15T14:00:00', type: 'date-picker', required: true },
        { key: 'end', label: 'End Date & Time', placeholder: '2024-01-15T15:00:00', type: 'date-picker', required: true },
        { key: 'location', label: 'Location', placeholder: 'Conference Room A', type: 'text', required: false },
        { key: 'description', label: 'Description', placeholder: 'Event description...', type: 'text', required: false }
      ]
    },
    {
      type: 'location',
      label: 'Location',
      description: 'Share geographic coordinates',
      icon: MapPin,
      fields: [
        { key: 'latitude', label: 'Latitude', placeholder: '40.7128', type: 'text', required: true },
        { key: 'longitude', label: 'Longitude', placeholder: '-74.0060', type: 'text', required: true },
        { key: 'name', label: 'Location Name', placeholder: 'Times Square, NYC', type: 'text', required: false }
      ]
    },
    {
      type: 'sms',
      label: 'SMS',
      description: 'Send text message to number',
      icon: MessageSquare,
      fields: [
        { key: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567', type: 'tel', required: true },
        { key: 'message', label: 'Message', placeholder: 'Your message here...', type: 'text', required: false }
      ]
    }
  ]

  // Format data based on template
  const formatTemplateData = (template: QRTemplate, data: TemplateFormData): string => {
    switch (template) {
      case 'url':
        return data.url || ''
      case 'email':
        const emailParts = []
        emailParts.push(`mailto:${data.email}`)
        if (data.subject) emailParts.push(`?subject=${encodeURIComponent(data.subject)}`)
        if (data.body) emailParts.push(`${emailParts.length === 1 ? '?' : '&'}body=${encodeURIComponent(data.body)}`)
        return emailParts.length === 1 ? emailParts[0] : emailParts.join('')
      case 'phone':
        return `tel:${data.phone}`
      case 'wifi':
        const wifiString = `WIFI:T:${data.encryption || 'WPA'};S:${data.ssid};P:${data.password};;`
        return wifiString
      case 'vcard':
        let vcard = 'BEGIN:VCARD\nVERSION:3.0\n'
        if (data.name) vcard += `FN:${data.name}\n`
        if (data.company) vcard += `ORG:${data.company}\n`
        if (data.phone) vcard += `TEL:${data.phone}\n`
        if (data.email) vcard += `EMAIL:${data.email}\n`
        if (data.website) vcard += `URL:${data.website}\n`
        vcard += 'END:VCARD'
        return vcard
      case 'event':
        const eventData = {
          title: data.title || '',
          start: data.start || '',
          end: data.end || '',
          location: data.location || '',
          description: data.description || ''
        }

        // Only generate QR code if we have required fields
        if (!eventData.title || !eventData.start || !eventData.end) {
          return ''
        }

        // Format dates for iCal (YYYYMMDDTHHMMSS format without Z for better compatibility)
        const formatDateForICal = (dateStr: string) => {
          const date = new Date(dateStr)
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          const seconds = String(date.getSeconds()).padStart(2, '0')
          return `${year}${month}${day}T${hours}${minutes}${seconds}`
        }

        const startDate = formatDateForICal(eventData.start)
        const endDate = formatDateForICal(eventData.end)

        let vcal = 'BEGIN:VEVENT\n'
        vcal += `SUMMARY:${eventData.title}\n`
        vcal += `DTSTART:${startDate}\n`
        vcal += `DTEND:${endDate}\n`
        if (eventData.location) vcal += `LOCATION:${eventData.location}\n`
        if (eventData.description) vcal += `DESCRIPTION:${eventData.description}\n`
        vcal += 'END:VEVENT'

        return vcal
      case 'location':
        const geoUrl = `geo:${data.latitude},${data.longitude}`
        if (data.name) {
          return `${geoUrl}?q=${encodeURIComponent(data.name)}`
        }
        return geoUrl
      case 'sms':
        let sms = `sms:${data.phone}`
        if (data.message) sms += `?body=${encodeURIComponent(data.message)}`
        return sms
      default:
        return data.text || ''
    }
  }

  // Update text when template or form data changes
  useEffect(() => {
    const formattedText = formatTemplateData(selectedTemplate, templateFormData)
    setText(formattedText)
  }, [selectedTemplate, templateFormData])

  const sizeOptions = {
    small: { width: 200, label: 'Small (200x200)' },
    medium: { width: 300, label: 'Medium (300x300)' },
    large: { width: 400, label: 'Large (400x400)' }
  }

  const getQRCodeOptions = useCallback((forStats = false) => ({
    width: sizeOptions[size].width,
    margin: 2,
    color: {
      dark: '#000000FF',
      light: '#FFFFFFFF'
    },
    errorCorrectionLevel: errorCorrectionLevel as 'L' | 'M' | 'Q' | 'H'
  }), [size, errorCorrectionLevel])

  const generateQRStats = useCallback(async () => {
    try {
      // Create QR code to get version and module count
      const qrCodeOptions = {
        errorCorrectionLevel: errorCorrectionLevel as 'L' | 'M' | 'Q' | 'H'
      }
      const qrCodeData = QRCode.create(text.trim(), qrCodeOptions)

      // Get data length in bits
      const dataLength = new TextEncoder().encode(text.trim()).length * 8

      const stats: QRStats = {
        version: qrCodeData.version,
        dataBits: dataLength,
        totalBits: qrCodeData.modules.size * qrCodeData.modules.size,
        size: `${qrCodeData.modules.size}x${qrCodeData.modules.size} modules`
      }

      setQrStats(stats)
    } catch (error) {
      console.error('Error generating stats:', error)
      setQrStats(null)
    }
  }, [text, errorCorrectionLevel])

  const generateQRCode = useCallback(async (forStats = false) => {
    if (!text.trim()) {
      setQrCodeDataURL("")
      setQrStats(null)
      setError("")
      return
    }

    setLoading(true)
    setError("")

    try {
      let dataURL: string
      const options = getQRCodeOptions(forStats)

      if (format === 'svg' && !forStats) {
        dataURL = await QRCode.toString(text.trim(), { ...options, type: 'svg' })

        // Convert SVG to data URL for display
        const svgBlob = new Blob([dataURL], { type: 'image/svg+xml' })
        const svgDataURL = URL.createObjectURL(svgBlob)
        setQrCodeDataURL(svgDataURL)
      } else {
        dataURL = await QRCode.toDataURL(text.trim(), {
          ...options,
          ...(format === 'jpg' && !forStats ? { rendererOpts: { quality: 0.92 } } : {})
        })
        setQrCodeDataURL(dataURL)
      }

      // Generate stats if not already calculating for stats
      if (!forStats) {
        await generateQRStats()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate QR code. The text might be too long."
      console.error('Error generating QR code:', error)
      setError(errorMessage)
      setQrCodeDataURL("")
      setQrStats(null)
    } finally {
      setLoading(false)
    }
  }, [text, format, getQRCodeOptions, generateQRStats])

  useEffect(() => {
    generateQRCode()
  }, [generateQRCode])

  const copyToClipboard = () => {
    if (!text) return

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
      toast.success("Text copied to clipboard")
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
        toast.success("Text copied to clipboard")
      } catch (err) {
        toast.error("Failed to copy to clipboard")
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeDataURL) return

    const link = document.createElement("a")

    if (format === 'svg') {
      link.href = qrCodeDataURL
      link.download = `qr-code-${text.slice(0, 20)}.svg`
    } else {
      link.href = qrCodeDataURL
      link.download = `qr-code-${text.slice(0, 20)}.${format}`
    }

    link.click()
    toast.success("QR Code downloaded")
  }

  const shareQRCode = () => {
    if (!text) return

    const url = `${window.location.origin}${window.location.pathname}?text=${encodeURIComponent(text)}&format=${format}&size=${size}&ecl=${errorCorrectionLevel}&frame=${frameType}`

    if (navigator.share) {
      navigator.share({
        title: 'QR Code',
        text: `Check out this QR code: ${url}`,
        url: url
      }).catch(() => {
        copyToClipboard()
      })
    } else {
      copyToClipboard()
    }
  }

  // Frame type options with labels and descriptions
  const frameTypeOptions = {
    none: { label: 'No Frame', description: 'Plain QR code without frame' },
    square: { label: 'Square Frame', description: 'Classic square border around QR code' },
    rounded: { label: 'Rounded Frame', description: 'Rounded corners for a modern look' },
    dashed: { label: 'Dashed Frame', description: 'Dashed border for artistic design' },
    heart: { label: 'Heart Frame', description: 'Heart-shaped frame for special occasions' },
    floral: { label: 'Floral Frame', description: 'Decorative floral pattern around QR code' },
    tech: { label: 'Tech Frame', description: 'Modern tech-inspired geometric borders' },
    industrial: { label: 'Industrial Frame', description: 'Bold, heavy borders for industrial look' },
    geometric: { label: 'Geometric Frame', description: 'Complex geometric patterns and shapes' }
  }

  // Function to get frame styles
  const getFrameStyles = (frameType: FrameType, imageSize: number) => {
    const basePadding = 24
    const baseBorderWidth = 4

    switch (frameType) {
      case 'square':
        return {
          padding: `${basePadding}px`,
          border: `${baseBorderWidth}px solid #2563eb`,
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 4px 15px rgba(37,99,235,0.1)',
          position: 'relative' as const
        }
      case 'rounded':
        return {
          padding: `${basePadding}px`,
          border: `3px solid linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
          borderRadius: '20px',
          backgroundColor: '#ffffff',
          boxShadow: '0 15px 35px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5)',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          position: 'relative' as const
        }
      case 'dashed':
        return {
          padding: `${basePadding}px`,
          border: '4px dashed #10b981',
          borderRadius: '16px',
          backgroundColor: '#f0fdf4',
          boxShadow: '0 8px 20px rgba(16,185,129,0.15)',
          position: 'relative' as const
        }
      case 'heart':
        return {
          padding: `${basePadding + 15}px`,
          backgroundColor: '#fef2f2',
          position: 'relative' as const,
          borderRadius: '24px',
          boxShadow: '0 12px 30px rgba(220,38,38,0.2)',
          border: '2px solid #fca5a5',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' fill='%23dc2626'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: '60px 60px'
        }
      case 'floral':
        return {
          padding: `${basePadding}px`,
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: '3px solid #ffffff',
          boxShadow: '0 15px 35px rgba(102,126,234,0.3)',
          backgroundImage: `
            radial-gradient(circle at 20% 80%, #ffffff 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, #ffffff 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, #ffffff 0%, transparent 50%)
          `,
          position: 'relative' as const
        }
      case 'tech':
        return {
          padding: `${basePadding}px`,
          borderRadius: '14px',
          backgroundColor: '#0f172a',
          border: '2px solid #06b6d4',
          boxShadow: '0 10px 25px rgba(6,182,212,0.2), inset 0 1px 2px rgba(255,255,255,0.1)',
          backgroundImage: `
            linear-gradient(45deg, rgba(6,182,212,0.1) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(6,182,212,0.1) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(6,182,212,0.1) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(6,182,212,0.1) 75%)
          `,
          backgroundSize: '12px 12px',
          position: 'relative' as const
        }
      case 'industrial':
        return {
          padding: `${basePadding}px`,
          borderRadius: '8px',
          backgroundColor: '#374151',
          border: '4px solid #9ca3af',
          boxShadow: '0 15px 35px rgba(0,0,0,0.4), inset 0 2px 4px rgba(156,163,175,0.3)',
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(156,163,175,0.3) 4px, rgba(156,163,175,0.3) 8px),
            repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(156,163,175,0.3) 4px, rgba(156,163,175,0.3) 8px)
          `,
          position: 'relative' as const
        }
      case 'geometric':
        return {
          padding: `${basePadding}px`,
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '3px solid #7c3aed',
          boxShadow: '0 12px 30px rgba(124,58,237,0.3)',
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
          position: 'relative' as const
        }
      default:
        return {
          padding: '0px',
          border: 'none',
          borderRadius: '0px',
          backgroundColor: 'transparent'
        }
    }
  }


  const handleTemplateChange = (template: QRTemplate) => {
    setSelectedTemplate(template)
    setTemplateFormData({})
  }

  const handleFormFieldChange = (key: string, value: string) => {
    setTemplateFormData(prev => ({ ...prev, [key]: value }))
  }

  const currentTemplate = templates.find(t => t.type === selectedTemplate)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">QR Code Generator</h2>
          <p className="text-muted-foreground">Generate custom QR codes with various templates and formats</p>
        </div>

        {/* Frame Selection Button */}


        <div className="grid gap-6 lg:grid-cols-2">
          {/* Template Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quick Templates</CardTitle>
                <CardDescription>
                  Choose a template type or start with text
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 grid-rows-2 gap-2">
                  {templates.map((template) => {
                    const IconComponent = template.icon
                    const isSelected = selectedTemplate === template.type

                    return (
                      <TooltipProvider key={template.type}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleTemplateChange(template.type)}
                              className={`p-3 rounded-lg border-2 transition-all duration-200 text-center hover:shadow-md ${isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                                }`}
                            >
                              <IconComponent className={`h-6 w-6 mx-auto mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'
                                }`} />
                              <div className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'
                                }`}>
                                {template.label}
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{template.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Template Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  {currentTemplate ? (
                    <currentTemplate.icon className="h-5 w-5 text-primary" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-primary" />
                  )}
                  {currentTemplate?.label || 'Text'} Details
                </CardTitle>
                <CardDescription>
                  {currentTemplate?.description || 'Simple text message'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentTemplate?.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={`${selectedTemplate}-${field.key}`} className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.type === 'date-picker' ? (
                      <DateTimePicker
                        dateTime={
                          templateFormData[field.key]
                            ? new Date(templateFormData[field.key])
                            : undefined
                        }
                        onDateTimeChange={(date) => {
                          handleFormFieldChange(field.key, date ? date.toISOString() : '')
                        }}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <Input
                        id={`${selectedTemplate}-${field.key}`}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={templateFormData[field.key] || ''}
                        onChange={(e) => handleFormFieldChange(field.key, e.target.value)}
                        autoFocus={field.key === 'text' && selectedTemplate === 'text'}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* QR Code Display */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Generated QR Code</CardTitle>
                    <CardDescription>
                      {text ? "Ready to download and share" : "Fill form to generate QR code"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {qrStats && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <div className="text-sm space-y-1">
                              <div><strong>Version:</strong> {qrStats.version}</div>
                              <div><strong>Size:</strong> {qrStats.size}</div>
                              <div><strong>Data Bits:</strong> {qrStats.dataBits}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <div className="flex justify-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="lg" className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Choose Frame Template
                            {frameType !== 'none' && (
                              <span className="px-2 py-1 text-xs bg-primary text-white rounded-full">
                                {frameTypeOptions[frameType]?.label}
                              </span>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-4xl">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">Choose Frame Template</DialogTitle>
                            <DialogDescription>
                              Select a decorative frame for your QR code. Click on any frame to preview and select it.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-6">
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-6">
                              {Object.entries(frameTypeOptions).map(([key, option]) => {
                                const isSelected = frameType === key
                                const previewStyles = getFrameStyles(key as FrameType, 80)
                                const smallQRCode = `
                      <svg width="80" height="80" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0" y="0" width="21" height="21" fill="white"/>
                        <rect x="0" y="0" width="7" height="7" fill="black"/>
                        <rect x="14" y="0" width="7" height="7" fill="black"/>
                        <rect x="0" y="14" width="7" height="7" fill="black"/>
                        <rect x="2" y="2" width="3" height="3" fill="white"/>
                        <rect x="16" y="2" width="3" height="3" fill="white"/>
                        <rect x="2" y="16" width="3" height="3" fill="white"/>
                        <rect x="8" y="8" width="5" height="5" fill="black"/>
                      </svg>
                    `

                                return (
                                  <div key={key} className="space-y-3">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => {
                                              setFrameType(key as FrameType)
                                            }}
                                            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${isSelected
                                                ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                                                : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                                              }`}
                                          >
                                            <div
                                              className="flex items-center justify-center mb-2"
                                              style={{
                                                ...previewStyles,
                                                width: '80px',
                                                height: '80px',
                                                transform: 'scale(0.6)',
                                                transformOrigin: 'center',
                                                padding: '12px',
                                                margin: '0 auto'
                                              }}
                                            >
                                              <div dangerouslySetInnerHTML={{ __html: smallQRCode }} />
                                            </div>
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                          <div className="text-sm">
                                            <div className="font-semibold">{option.label}</div>
                                            <div className="text-muted-foreground">{option.description}</div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <div className="text-center">
                                      <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'
                                        }`}>
                                        {option.label}
                                      </div>
                                      {isSelected && (
                                        <div className="text-xs text-primary mt-1">✓ Selected</div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>QR Settings</DialogTitle>
                          <DialogDescription>
                            Customize QR code size, format, error correction and frame style
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Size</Label>
                              <Select value={size} onValueChange={(value: QRSize) => setSize(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="small">{sizeOptions.small.label}</SelectItem>
                                  <SelectItem value="medium">{sizeOptions.medium.label}</SelectItem>
                                  <SelectItem value="large">{sizeOptions.large.label}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Format</Label>
                              <Select value={format} onValueChange={(value: QRFormat) => setFormat(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="png">PNG</SelectItem>
                                  <SelectItem value="jpg">JPG</SelectItem>
                                  <SelectItem value="svg">SVG</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Error Correction Level</Label>
                            <Select value={errorCorrectionLevel} onValueChange={(value: ErrorCorrectionLevel) => setErrorCorrectionLevel(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="L">Low (7%)</SelectItem>
                                <SelectItem value="M">Medium (15%)</SelectItem>
                                <SelectItem value="Q">Quartile (25%)</SelectItem>
                                <SelectItem value="H">High (30%)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Higher levels = better error recovery but denser codes
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Frame Style</Label>
                            <Select value={frameType} onValueChange={(value: FrameType) => setFrameType(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(frameTypeOptions).map(([key, option]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{option.label}</span>
                                      <span className="text-xs text-muted-foreground">{option.description}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Add decorative frames around your QR code
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  {loading ? (
                    <div className="text-center space-y-4">
                      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto"></div>
                      <p className="text-muted-foreground">Generating QR code...</p>
                    </div>
                  ) : qrCodeDataURL ? (
                    <div className="space-y-6">
                      <div style={getFrameStyles(frameType, sizeOptions[size].width)} className="inline-block">
                        <img
                          src={format === 'svg' ? qrCodeDataURL : qrCodeDataURL}
                          alt={`QR Code for: ${text}`}
                          style={{ maxWidth: `${sizeOptions[size].width}px`, width: '100%', height: 'auto' }}
                        />
                      </div>

                      <div className="flex gap-2 justify-center">
                        <Button onClick={downloadQRCode}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" onClick={shareQRCode}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/50" />
                      <p className="text-muted-foreground">Fill the form above to generate your QR code</p>
                    </div>
                  )}
                </div>

                {error && (
                  <Alert className="mt-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
