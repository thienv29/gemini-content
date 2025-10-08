import { NextRequest } from 'next/server'
import { handleBulkDelete } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  return handleBulkDelete({
    table: 'promptGroup',
    entityName: 'prompt group',
    request
  })
}
