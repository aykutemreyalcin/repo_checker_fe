export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type FindingCategory = 'SECRET' | 'ENV_FILE' | 'SUSPICIOUS_SCRIPT'

export interface Finding {
  severity: Severity
  category: FindingCategory
  filePath: string
  lineNumber?: number
  description: string
  snippet?: string
}

export interface StartScanResponse {
  jobId: string
  status: ScanStatus
}

export interface ScanResultResponse {
  jobId?: string
  status: ScanStatus
  findingCount?: number
  findings?: Finding[]
  errorMessage?: string
  repoUrl?: string
}

const API_BASE = '/api/github/scan'

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { message?: string; error?: string }
      message = body.message ?? body.error ?? message
    } catch {
      /* empty body */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

function toFetchError(err: unknown): Error {
  if (err instanceof Error) {
    if (err.name === 'TypeError') {
      return new Error(
        'Cannot reach the server. Is the backend running on localhost:8080?',
      )
    }
    return err
  }
  return new Error('An unexpected error occurred')
}

export async function startScan(repoUrl: string): Promise<StartScanResponse> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl }),
    })
    return parseJson<StartScanResponse>(res)
  } catch (err) {
    throw toFetchError(err)
  }
}

export async function getScanResult(jobId: string): Promise<ScanResultResponse> {
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(jobId)}`)
    return parseJson<ScanResultResponse>(res)
  } catch (err) {
    throw toFetchError(err)
  }
}
