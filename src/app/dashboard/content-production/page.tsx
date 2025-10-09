"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Wand2, Copy, RefreshCw } from "lucide-react"
import axios from "axios"
import { toast } from "sonner"
import { Loading } from "@/components/ui/loading"

interface Prompt {
  id: string
  name: string
  description?: string
  content: string
  variables: Record<string, unknown>
}

interface PromptSetting {
  id: string
  name: string
  description?: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  prompts?: Prompt[] // Add collected prompts
}

interface GeneratedContent {
  id: string
  content: string
  promptUsed?: string
  model: string
  createdAt: string
}

export default function ContentProductionPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [promptSettings, setPromptSettings] = useState<PromptSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([])

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogTab, setDialogTab] = useState<"single" | "setting">("single")

  // Form states for dialog
  const [dialogSelectedPrompt, setDialogSelectedPrompt] = useState<string>("")
  const [dialogSelectedSetting, setDialogSelectedSetting] = useState<string>("")
  const [dialogVariableValues, setDialogVariableValues] = useState<Record<string, string>>({})
  const [dialogSettingVariables, setDialogSettingVariables] = useState<string[]>([])

  // Final prompt in textarea
  const [finalPrompt, setFinalPrompt] = useState("")

  // Form states for generation
  const [selectedPromptSetting, setSelectedPromptSetting] = useState<string>("none")
  const [customModel, setCustomModel] = useState("gemini-2.0-flash-exp")

  const fetchPrompts = useCallback(async () => {
    try {
      const response = await axios.get('/api/prompts')
      setPrompts(response.data.data)
    } catch (error) {
      console.error('Error fetching prompts:', error)
    }
  }, [])

  const fetchPromptSettings = useCallback(async () => {
    try {
      const response = await axios.get('/api/prompt-settings')
      setPromptSettings(response.data.data)
    } catch (error) {
      console.error('Error fetching prompt settings:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchPrompts(), fetchPromptSettings()])
      setLoading(false)
    }
    loadData()
  }, [fetchPrompts, fetchPromptSettings])

  const handleDialogPromptChange = (promptId: string) => {
    setDialogSelectedPrompt(promptId)
    const prompt = prompts.find(p => p.id === promptId)
    if (prompt) {
      const initialValues: Record<string, string> = {}
      Object.keys(prompt.variables).forEach(key => {
        initialValues[key] = ""
      })
      setDialogVariableValues(initialValues)
    }
  }

  const handleDialogVariableChange = (variable: string, value: string) => {
    setDialogVariableValues(prev => ({ ...prev, [variable]: value }))
  }

  // Load setting variables when setting is selected
  useEffect(() => {
    const loadSettingVariables = async () => {
      if (!dialogSelectedSetting) {
        setDialogSettingVariables([])
        return
      }

      try {
        const response = await axios.get(`/api/prompt-settings/${dialogSelectedSetting}`)
        const setting = response.data

        const settingItems = setting.items as any
        const promptItems = settingItems?.prompts || []

        const promptIds = promptItems.map((item: any) => item.promptId)
        const promptsResponse = await axios.get('/api/prompts')
        const allPrompts = promptsResponse.data.data

        const collectedPrompts = allPrompts.filter((p: any) => promptIds.includes(p.id))

        // Collect unique variables from all prompts
        const allVariables = [...new Set(
          collectedPrompts.flatMap((p: any) => Object.keys(p.variables))
        )] as string[]

        setDialogSettingVariables(allVariables)

        // Initialize variable values
        const initialValues: Record<string, string> = {}
        allVariables.forEach(key => {
          initialValues[key] = ""
        })
        setDialogVariableValues(initialValues)

      } catch (error) {
        console.error('Error loading setting variables:', error)
      }
    }

    if (dialogTab === "setting") {
      loadSettingVariables()
    }
  }, [dialogSelectedSetting, dialogTab])

  const applySinglePrompt = () => {
    if (!dialogSelectedPrompt) return

    const prompt = prompts.find(p => p.id === dialogSelectedPrompt)
    if (!prompt) return

    let mergedPrompt = prompt.content

    // Replace variables
    Object.entries(dialogVariableValues).forEach(([key, value]) => {
      mergedPrompt = mergedPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    setFinalPrompt(mergedPrompt)
    setIsDialogOpen(false)
    toast.success("Đã áp dụng prompt!")
  }

  const applySettingPrompt = async () => {
    if (!dialogSelectedSetting) return

    try {
      // Fetch the full setting details to get prompts collection
      const response = await axios.get(`/api/prompt-settings/${dialogSelectedSetting}`)
      const setting = response.data

      // Get prompts from setting.items.prompts (array of { promptId, position })
      const settingItems = setting.items as any
      const promptItems = settingItems?.prompts || []

      if (!promptItems || promptItems.length === 0) {
        toast.error("Setting này không có prompts nào được cấu hình")
        return
      }

      // Extract prompt IDs and sort by position
      const promptIds = promptItems
        .sort((a: any, b: any) => a.position - b.position)
        .map((item: any) => item.promptId)

      // Fetch all prompts by IDs
      const promptsResponse = await axios.get('/api/prompts')
      const allPrompts = promptsResponse.data.data

      // Filter to get only the prompts in this setting, maintaining order
      const collectedPrompts = promptIds
        .map((id: string) => allPrompts.find((p: any) => p.id === id))
        .filter(Boolean)

      if (collectedPrompts.length === 0) {
        toast.error("Không tìm thấy prompts trong setting này")
        return
      }

      let mergedContent = ""

      collectedPrompts.forEach((prompt: any, index: number) => {
        let promptContent = prompt.content

        // Replace variables for this prompt
        Object.entries(dialogVariableValues).forEach(([key, value]) => {
          promptContent = promptContent.replace(new RegExp(`{{${key}}}`, 'g'), value)
        })

        mergedContent += promptContent
        if (index < collectedPrompts.length - 1) mergedContent += "\n\n"
      })

      setFinalPrompt(mergedContent)
      setIsDialogOpen(false)
      toast.success(`Đã merge ${collectedPrompts.length} prompts theo thứ tự thành công!`)
    } catch (error) {
      console.error('Error loading setting prompts:', error)
      toast.error("Có lỗi khi tải prompts từ setting")
    }
  }

  const generateContent = async () => {
    if (!finalPrompt.trim()) {
      toast.error("Vui lòng nhập prompt trước!")
      return
    }

    try {
      setGenerating(true)
      const response = await axios.post('/api/content/generate', {
        customPrompt: finalPrompt,
        promptSettingId: selectedPromptSetting || undefined,
        customModel
      })

      const newContent: GeneratedContent = {
        id: Date.now().toString(),
        content: response.data.content,
        promptUsed: finalPrompt,
        model: response.data.model,
        createdAt: new Date().toISOString()
      }

      setGeneratedContent(prev => [newContent, ...prev])
      toast.success("Content generated successfully!")
    } catch (error) {
      console.error('Error generating content:', error)
      toast.error("Failed to generate content")
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success("Copied to clipboard!")
  }

  const openPromptDialog = () => {
    setIsDialogOpen(true)
  }

  if (loading) {
    return <Loading className="top-16"/>
  }

  const selectedPromptObj = prompts.find(p => p.id === dialogSelectedPrompt)
  const selectedSettingObj = promptSettings.find(p => p.id === dialogSelectedSetting)

  return (
    <div className="flex flex-col gap-6 p-6 pt-4 h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Production</h1>
          <p className="text-muted-foreground">
            Tạo content bằng Gemini AI
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Generation Form - Left Column */}
        <div className="xl:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Tạo Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 h-[calc(100%-5rem)] overflow-y-auto">
              {/* Final Prompt */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">
                    Prompt:
                  </Label>
                  <Button variant="outline" size="sm" onClick={openPromptDialog}>
                    Chọn Prompt
                  </Button>
                </div>
                <Textarea
                  value={finalPrompt}
                  onChange={(e) => setFinalPrompt(e.target.value)}
                  placeholder="Nhập prompt hoặc chọn từ danh sách..."
                  className="min-h-[150px] resize-none"
                />
              </div>

              {/* Custom Model Override */}
              <div className="space-y-4">
                <Label className="text-base font-medium">
                  Model AI:
                </Label>
                <Select value={customModel} onValueChange={setCustomModel}>
                  <SelectTrigger id="model-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Khuyến nghị)</SelectItem>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateContent}
                disabled={generating || !finalPrompt.trim()}
                className="w-full"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                {generating ? "Đang tạo..." : "Tạo Content"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Content History - Right Column (2 spans) */}
        <div className="xl:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Content History ({generatedContent.length} phiên bản)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)] overflow-y-auto">
              {generatedContent.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
                  <Wand2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Chưa có content nào</h3>
                  <p className="text-sm">Hãy tạo content đầu tiên bằng form bên trái</p>
                  <div className="mt-4 text-xs text-muted-foreground">
                    <p>📝 Mỗi lần tạo sẽ lưu phiên bản riêng</p>
                    <p>📋 Bạn có thể xem và sao chép tất cả phiên bản cũ</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedContent.map((item, index) => (
                    <Card key={item.id} className="relative">
                      <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                        Phiên bản {generatedContent.length - index}
                      </div>
                      <CardContent className="pt-12">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-sm text-muted-foreground">
                                {new Date(item.createdAt).toLocaleString('vi-VN')}
                              </div>
                              <div className="text-xs bg-muted px-2 py-1 rounded">
                                {item.model}
                              </div>
                            </div>
                            {item.promptUsed && (
                              <div className="mb-3">
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                    Xem prompt đã dùng
                                  </summary>
                                  <pre className="mt-2 p-2 bg-muted rounded text-xs whitespace-pre-wrap font-mono">
                                    {item.promptUsed}
                                  </pre>
                                </details>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(item.content)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </div>

                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed border-l-2 border-muted pl-4">
                            {item.content}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prompt Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chọn Prompt</DialogTitle>
          </DialogHeader>

          <Tabs value={dialogTab} onValueChange={(value) => setDialogTab(value as "single" | "setting")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Chọn 1 Prompt</TabsTrigger>
              <TabsTrigger value="setting">Chọn Setting (Collection)</TabsTrigger>
            </TabsList>

            {/* Single Prompt Tab */}
            <TabsContent value="single" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Label>Select Prompt:</Label>
                <Select value={dialogSelectedPrompt} onValueChange={handleDialogPromptChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn prompt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPromptObj && (
                <div className="space-y-4">
                  <Label>Điền biến cho Prompt:</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(selectedPromptObj.variables).map((key) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`var-${key}`}>{key}</Label>
                        <Input
                          id={`var-${key}`}
                          value={dialogVariableValues[key] || ""}
                          onChange={(e) => handleDialogVariableChange(key, e.target.value)}
                          placeholder={`Nhập ${key}...`}
                        />
                      </div>
                    ))}
                  </div>

                  <Button onClick={applySinglePrompt} className="w-full">
                    Áp dụng Prompt
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Setting Collection Tab */}
            <TabsContent value="setting" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Label>Chọn Setting:</Label>
                <Select value={dialogSelectedSetting} onValueChange={setDialogSelectedSetting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn setting..." />
                  </SelectTrigger>
                  <SelectContent>
                    {promptSettings.map((setting) => (
                      <SelectItem key={setting.id} value={setting.id}>
                        {setting.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSettingObj && (
                  <p className="text-sm text-muted-foreground">
                    {selectedSettingObj.description}
                  </p>
                )}
              </div>

              {dialogSelectedSetting && (
                <div className="space-y-4">
                  <Label>Điền biến tổng hợp từ tất cả prompts trong setting:</Label>

                  {/* Show actual variable fields from collected prompts */}
                  <div className="grid gap-4">
                    {dialogSettingVariables.map((variable) => (
                      <div key={variable}>
                        <Label htmlFor={`var-${variable}`} className="text-sm">
                          {variable}
                        </Label>
                        <Input
                          id={`var-${variable}`}
                          value={dialogVariableValues[variable] || ""}
                          onChange={(e) => handleDialogVariableChange(variable, e.target.value)}
                          placeholder={`Nhập giá trị cho ${variable}`}
                        />
                      </div>
                    ))}

                    {dialogSettingVariables.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Setting này không có biến nào cần điền
                      </p>
                    )}
                  </div>

                  <Button onClick={applySettingPrompt} className="w-full">
                    Áp dụng & Merge Prompts từ Setting
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
