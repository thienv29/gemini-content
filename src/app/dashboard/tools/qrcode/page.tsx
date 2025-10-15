"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Copy,
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
  Globe,
  MessageSquare,
  Settings
} from "lucide-react"
import { toast } from "sonner"
import QRCode from 'qrcode'

type QRSize = 'small' | 'medium' | 'large'
type QRFormat = 'png' | 'jpg' | 'svg'
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'
type QRTemplate = 'text' | 'url' | 'email' | 'phone' | 'wifi' | 'vcard' | 'event' | 'location' | 'sms'

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
  icon: React.ComponentType<any>
  fields: Array<{
    key: string
    label: string
    placeholder: string
    type: 'text' | 'email' | 'tel' | 'url' | 'password'
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
        { key: 'start', label: 'Start Date & Time', placeholder: '2024-01-15T14:00:00', type: 'text', required: true },
        { key: 'end', label: 'End Date & Time', placeholder: '2024-01-15T15:00:00', type: 'text', required: true },
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
        return `BEGIN:VEVENT\nSUMMARY:${eventData.title}\nDTSTART:${eventData.start}\nDTEND:${eventData.end}\n${eventData.location ? `LOCATION:${eventData.location}\n` : ''}${eventData.description ? `DESCRIPTION:${eventData.description}\n` : ''}END:VEVENT`
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

  const getQRCodeOptions = (forStats = false) => ({
    width: sizeOptions[size].width,
    margin: 2,
    color: {
      dark: '#000000FF',
      light: '#FFFFFFFF'
    },
    errorCorrectionLevel: errorCorrectionLevel as 'L' | 'M' | 'Q' | 'H'
  })

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
    } catch (error: any) {
      console.error('Error generating QR code:', error)
      setError(error.message || "Failed to generate QR code. The text might be too long.")
      setQrCodeDataURL("")
      setQrStats(null)
    } finally {
      setLoading(false)
    }
  }, [text, size, format, errorCorrectionLevel])

  const generateQRStats = async () => {
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
  }

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

    const url = `${window.location.origin}${window.location.pathname}?text=${encodeURIComponent(text)}&format=${format}&size=${size}&ecl=${errorCorrectionLevel}`

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


  const handleTemplateChange = (template: QRTemplate) => {
    setSelectedTemplate(template)
    setTemplateFormData({})
  }

  const handleFormFieldChange = (key: string, value: string) => {
    setTemplateFormData(prev => ({ ...prev, [key]: value }))
  }

  const currentTemplate = templates.find(t => t.type === selectedTemplate)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">QR Code Generator</h1>
        <p className="text-muted-foreground mt-2">
          Generate professional QR codes with ready-made templates for common use cases. Perfect for businesses, events, and personal use.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="col-span-12 lg:col-span-4">
          {/* Template Selection Tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {templates.map((template) => {
              const IconComponent = template.icon
              return (
                <Button
                  key={template.type}
                  variant={selectedTemplate === template.type ? "default" : "outline"}
                  className="justify-start h-auto p-3 text-left"
                  onClick={() => handleTemplateChange(template.type)}
                >
                  <IconComponent className="mr-2 h-4 w-4 flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-medium text-sm truncate">{template.label}</div>
                  </div>
                </Button>
              )
            })}
          </div>

          {/* Template Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                {currentTemplate ? <currentTemplate.icon className="mr-3 h-6 w-6" /> : <MessageSquare className="mr-3 h-6 w-6" />}
                {currentTemplate?.label || 'Text'}
              </CardTitle>
              <CardDescription>{currentTemplate?.description || 'Simple text message'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentTemplate?.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`${selectedTemplate}-${field.key}`}>
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id={`${selectedTemplate}-${field.key}`}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={templateFormData[field.key] || ''}
                    onChange={(e) => handleFormFieldChange(field.key, e.target.value)}
                    autoFocus={field.key === 'text' && selectedTemplate === 'text'}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* QR Code Display */}
        <div className="col-span-12 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Generated QR Code
                <div className="flex items-center gap-1">
                  {qrStats && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-2 text-sm">
                            <div><strong>Version:</strong> {qrStats.version}</div>
                            <div><strong>Size:</strong> {qrStats.size}</div>
                            <div><strong>Data Bits:</strong> {qrStats.dataBits}</div>
                            <div><strong>Total Bits:</strong> {qrStats.totalBits}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>QR Code Settings</DialogTitle>
                        <DialogDescription>
                          Customize your QR code appearance and error correction level.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
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
                            Higher levels provide better error recovery but make the QR code denser.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardTitle>
              <CardDescription>
                {text ? "Your QR code is ready" : "Fill the form to generate a QR code"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg min-h-[400px]">
                {loading ? (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
                    <p className="text-muted-foreground">Generating QR code...</p>
                  </div>
                ) : qrCodeDataURL ? (
                  <div className="space-y-4">
                    <img
                      src={format === 'svg' ? qrCodeDataURL : qrCodeDataURL}
                      alt={`QR Code for: ${text}`}
                      className="max-w-full h-auto mx-auto"
                      style={{ maxWidth: `${sizeOptions[size].width}px` }}
                    />
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={downloadQRCode}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm" onClick={shareQRCode}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">QR code will appear here</p>
                  </div>
                )}
              </div>

              {error && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
