'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, Download, Folder, Shield, Users } from 'lucide-react'

export default function TestPage() {
  const features = [
    {
      title: 'File Upload',
      description: 'Upload single or multiple files via drag & drop or file selection',
      icon: Upload,
      status: '✓ Complete'
    },
    {
      title: 'Folder Upload',
      description: 'Upload entire folder structures with recursive folder support',
      icon: Folder,
      status: '✓ Complete'
    },
    {
      title: 'Multi-Selection',
      description: 'Select multiple files with checkboxes for batch operations',
      icon: FileText,
      status: '✓ Complete'
    },
    {
      title: 'Tenant Isolation',
      description: 'Files are isolated per workspace/tenant for security',
      icon: Shield,
      status: '✓ Complete'
    },
    {
      title: 'Download Files',
      description: 'Download individual or selected files with proper MIME types',
      icon: Download,
      status: '✓ Complete'
    },
    {
      title: 'Collaboration',
      description: 'Multi-tenant workspace management for team file sharing',
      icon: Users,
      status: '✓ Complete'
    }
  ]

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">File Manager Test Suite</h1>
        <p className="text-xl text-muted-foreground">
          Comprehensive file management system with tenant isolation and advanced features
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {features.map((feature, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <feature.icon className="w-6 h-6 text-primary" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <Badge variant="secondary">{feature.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
          <CardDescription>
            Comprehensive testing guide for all file management features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">🔒 Workspace Isolation</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Switch between workspaces in the sidebar</li>
              <li>Upload files in each workspace</li>
              <li>Verify files are isolated per workspace</li>
              <li>(Currently: tenant1, tenant2, tenant3 are available)</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">📤 File Upload Test</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Drag & drop files onto the upload zone</li>
              <li>Use "Choose Files" button for file selection</li>
              <li>Try uploading multiple files simultaneously</li>
              <li>Monitor upload progress in the sidebar queue</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">📁 Folder Upload Test</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click "Upload" dropdown and select "Upload Folder"</li>
              <li>Choose a local folder with nested files</li>
              <li>Verify folder structure is maintained</li>
              <li>Note: This uses webkitdirectory attribute support</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">☑️ Multi-Selection Test</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Use individual checkboxes to select files</li>
              <li>Try "Select All" checkbox in header</li>
              <li>Test bulk download of selected files</li>
              <li>Test bulk delete of selected files</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">📂 Folder Navigation</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click on folder names to navigate directories</li>
              <li>Use breadcrumb navigation to go back</li>
              <li>Try creating new folders via the dropdown</li>
              <li>Test folder deletion from context menus</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">💾 File Operations</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click on file names to download individual files</li>
              <li>Use three-dot menu (⋯) for context actions</li>
              <li>Test individual file deletion with confirmation dialog</li>
              <li>Verify proper file type detection and icons</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex gap-4">
        <Button onClick={() => window.location.href = '/dashboard/uploads'}>
          Open File Manager
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
