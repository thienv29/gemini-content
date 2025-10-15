import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Share2 } from "lucide-react"

export default function TestPage() {
  return (
    <div className="p-6">
      <h1>Test Page</h1>
      <Card>
        <CardHeader>
          <CardTitle>Testing QR Code Settings</CardTitle>
          <CardDescription>Test the gear icon functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
