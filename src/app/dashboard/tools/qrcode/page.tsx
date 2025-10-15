"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Copy, Download, Share2, AlertCircle, CheckCircle, Info } from "lucide-react"
import { toast } from "sonner"
import QRCode from 'qrcode'

type QRSize = 'small' | 'medium' | 'large'
type QRFormat = 'png' | 'jpg' | 'svg'
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

interface QRStats {
  version: number
  dataBits: number
  totalBits: number
  size: string
}

export default function QrCodeToolPage() {
  const [text, setText] = useState("")
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [qrStats, setQrStats] = useState<QRStats | null>(null)

  // Configuration options
  const [size, setSize] = useState<QRSize>('medium')
  const [format, setFormat] = useState<QRFormat>('png')
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<ErrorCorrectionLevel>('M')

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


  return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">QR Code Generator</h1>
          <p className="text-muted-foreground mt-2">
            Generate professional QR codes with customizable options. Perfect for sharing URLs, text, or any data that needs to be encoded.
          </p>
        </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input & Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>
                Enter the text, URL, or any data you want to encode into a QR code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qr-text">Text to encode</Label>
                <div className="flex gap-2">
                  <Input
                    id="qr-text"
                    placeholder="Enter text, URL, or any data..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    disabled={!text}
                    title="Copy text to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {text && (
                  <p className="text-xs text-muted-foreground">
                    {text.length} characters • {new Blob([text]).size} bytes
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Customize your QR code appearance and error correction level.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </div>

        {/* QR Code Display */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Generated QR Code
                {qrStats && (
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
                )}
              </CardTitle>
              <CardDescription>
                {text ? "Your QR code is ready" : "Enter text above to generate a QR code"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg min-h-[350px]">
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
