import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/tenant"

interface PromptSettingsData {
  model?: string
  temperature?: number
  maxTokens?: number
  prompts?: Array<{
    promptId: string
    position: number
  }>
}

// Initialize Google AI (you'll need to set GEMINI_API_KEY in your .env)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" })

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get tenant
    const tenantId = await getTenantId(request)

    const body = await request.json()
    const { promptId, promptSettingId, variables, customPrompt, customModel } = body

    let finalPrompt = ""
    let model = customModel || "gemini-2.5-flash"

    // Handle custom prompt
    if (customPrompt && !promptId) {
      finalPrompt = customPrompt
    }
    // Handle prompt from database
    else if (promptId) {
      const prompt = await prisma.prompt.findFirst({
        where: { id: promptId, tenantId },
        include: { tenant: true }
      })

      if (!prompt) {
        return NextResponse.json({ error: "Prompt not found" }, { status: 404 })
      }

      finalPrompt = prompt.content

      // Replace variables in the prompt
      if (variables && Object.keys(variables).length > 0) {
        Object.entries(variables).forEach(([key, value]) => {
          finalPrompt = finalPrompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
        })
      }
    } else {
      return NextResponse.json({ error: "Either promptId or customPrompt is required" }, { status: 400 })
    }

    // Get prompt settings if provided and determine final model
    if (promptSettingId) {
      const settings = await prisma.promptSetting.findFirst({
        where: { id: promptSettingId, tenantId }
      })

      if (settings) {
        const settingsData = settings.items as PromptSettingsData
        // Use model from setting if customModel is "auto"
        if (settingsData?.model && customModel === "auto") {
          model = settingsData.model
        } else if (customModel !== "auto") {
          // Override with custom model if specified
          model = customModel
        } else {
          // Fallback to default
          model = "gemini-2.0-flash"
        }
      }
    } else {
      // No setting selected, use custom model or default
      model = customModel !== "auto" ? customModel : "gemini-2.0-flash"
    }

    // Generate content using the new GoogleGenAI client
    const response = await ai.models.generateContent({
      model: model,
      contents: finalPrompt,
    })

    const generatedText = response.text

    return NextResponse.json({
      content: generatedText,
      promptUsed: promptId ? finalPrompt : null,
      model,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error generating content:", error)

    // Handle specific Gemini API errors
    if (error instanceof Error) {
      if (error.message.includes("API_KEY")) {
        return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 })
      }
      if (error.message.includes("quota")) {
        return NextResponse.json({ error: "Gemini API quota exceeded" }, { status: 429 })
      }
    }

    return NextResponse.json({
      error: "Failed to generate content",
      details: process.env.NODE_ENV === "development" ? error : undefined
    }, { status: 500 })
  }
}
