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
import { Play, Wand2, Copy, RefreshCw, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
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
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0)

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
  const [customModel, setCustomModel] = useState("gemini-2.0-flash")

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
        if (index < collectedPrompts.length - 1) mergedContent += "\n"
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

  const navigateVersion = (direction: 'prev' | 'next') => {
    if (generatedContent.length === 0) return

    if (direction === 'prev') {
      setCurrentVersionIndex(prev => (prev > 0 ? prev - 1 : generatedContent.length - 1))
    } else {
      setCurrentVersionIndex(prev => (prev < generatedContent.length - 1 ? prev + 1 : 0))
    }
  }

  const goToVersion = (index: number) => {
    setCurrentVersionIndex(index)
  }

  const enhancePrompt = async () => {
    if (!finalPrompt.trim()) return

    try {
      setGenerating(true)
      const enhancePrompt = `Enhance and improve the following prompt to make it more effective for content generation. Make it more specific, actionable, and comprehensive. Return ONLY the enhanced prompt text, nothing else. Original prompt: "${finalPrompt}"`

      const response = await axios.post('/api/content/generate', {
        customPrompt: enhancePrompt,
        customModel: "gemini-2.0-flash"
      })

      const enhancedPrompt = response.data.content.trim()
      setFinalPrompt(enhancedPrompt)
      toast.success("Prompt enhanced successfully!")
    } catch (error) {
      console.error('Error enhancing prompt:', error)
      toast.error("Failed to enhance prompt")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <Loading className="top-16"/>
  }

  const selectedPromptObj = prompts.find(p => p.id === dialogSelectedPrompt)
  const selectedSettingObj = promptSettings.find(p => p.id === dialogSelectedSetting)
  const currentContent = generatedContent[currentVersionIndex]

  return (
    <div className="flex flex-col h-screen">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Creation */}
        <div className="w-96 border-r bg-muted/20 flex flex-col">
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Templates
                </h3>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={openPromptDialog}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Browse Templates
                </Button>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                  Generation
                </h3>

                {/* Prompt Input */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prompt-input" className="text-sm">
                      Your Prompt
                    </Label>
                    {finalPrompt.trim() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={enhancePrompt}
                        disabled={generating}
                        className="h-6 px-2 text-xs"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Enhance
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="prompt-input"
                    value={finalPrompt}
                    onChange={(e) => setFinalPrompt(e.target.value)}
                    placeholder="Describe what you want to create..."
                    className="min-h-[120px] resize-none"
                  />
                  {finalPrompt.length > 0 && (
                    <div className="text-xs text-muted-foreground text-right">
                      {finalPrompt.length} characters
                    </div>
                  )}
                </div>

                {/* Model Selection */}
                <div className="space-y-2 mb-6">
                  <Label className="text-sm">AI Model</Label>
                  <Select value={customModel} onValueChange={setCustomModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
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
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 bg-background flex flex-col">
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Generated Content
              {generatedContent.length > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({currentVersionIndex + 1} of {generatedContent.length})
                </span>
              )}
            </h2>
            {generatedContent.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateVersion('prev')}
                  disabled={generatedContent.length <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-1">
                  {generatedContent.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToVersion(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentVersionIndex
                          ? 'bg-primary'
                          : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                      title={`Version ${index + 1}`}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateVersion('next')}
                  disabled={generatedContent.length <= 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {generatedContent.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Wand2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No content generated yet</h3>
                <p className="text-muted-foreground max-w-sm">
                  Write a prompt in the left panel and click "Generate Content" to get started.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-6 overflow-y-auto h-full">
                {currentContent && (
                  <div className="space-y-6">
                    {/* Header with metadata */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <time>{new Date(currentContent.createdAt).toLocaleString()}</time>
                        <span className="bg-muted px-2 py-1 rounded text-xs">
                          {currentContent.model}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(currentContent.content)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>

                    {/* Prompt used (collapsible) */}
                    {currentContent.promptUsed && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View prompt used
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded text-xs whitespace-pre-wrap font-mono overflow-x-auto">
                          {currentContent.promptUsed}
                        </pre>
                      </details>
                    )}

                    {/* Content */}
                    <div className="bg-muted/30 rounded-lg p-6">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {currentContent.content}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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
