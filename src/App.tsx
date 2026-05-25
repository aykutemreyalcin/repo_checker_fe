import { useEffect, useRef, useState } from 'react'
import {
  getScanResult,
  startScan,
  type Finding,
  type ScanResultResponse,
} from './api/githubScan'
import './App.css'

const POLL_MS = 2000

function isTerminal(status: ScanResultResponse['status']) {
  return status === 'COMPLETED' || status === 'FAILED'
}

function formatFindingText(finding: Finding, index: number): string {
  const line =
    finding.lineNumber != null ? `:${finding.lineNumber}` : ''
  const lines = [
    `[${index + 1}] ${finding.severity} — ${finding.category}`,
    `File: ${finding.filePath}${line}`,
    `Description: ${finding.description}`,
  ]
  if (finding.snippet) {
    lines.push(`Snippet:\n${finding.snippet}`)
  }
  return lines.join('\n')
}

function formatResultsAsTxt(
  result: ScanResultResponse,
  repoUrl: string,
): string {
  const header = [
    'RepoChecker Scan Results',
    `Repository: ${result.repoUrl ?? repoUrl}`,
    `Status: ${result.status}`,
    `Generated: ${new Date().toISOString()}`,
    '',
  ]

  if (result.status === 'FAILED') {
    header.push(`Error: ${result.errorMessage ?? 'Scan failed'}`)
    return header.join('\n')
  }

  const count = result.findingCount ?? result.findings?.length ?? 0
  header.push(`Findings: ${count}`, '')

  if (count === 0) {
    header.push('No issues found.')
    return header.join('\n')
  }

  const body = (result.findings ?? []).map((finding, index) =>
    formatFindingText(finding, index),
  )
  return [...header, ...body].join('\n\n')
}

function downloadTxt(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function scanResultFilename(repoUrl: string): string {
  const slug = repoUrl
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const base = slug || 'scan-results'
  return `${base}.txt`
}

function FindingItem({ finding }: { finding: Finding }) {
  const severity = finding.severity.toLowerCase()
  const line =
    finding.lineNumber != null ? `:${finding.lineNumber}` : ''

  return (
    <li className="finding">
      <div className="finding-meta">
        <span className={`severity severity-${severity}`}>
          {finding.severity}
        </span>
        <span className="category">{finding.category}</span>
      </div>
      <p className="finding-path">
        {finding.filePath}
        {line}
      </p>
      <p className="finding-desc">{finding.description}</p>
      {finding.snippet ? (
        <pre className="finding-snippet">{finding.snippet}</pre>
      ) : null}
    </li>
  )
}

function App() {
  const [repoUrl, setRepoUrl] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResultResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => () => stopPolling(), [])

  const trimmedUrl = repoUrl.trim()
  const canSubmit = trimmedUrl.length > 0 && !isChecking

  const handleCheck = async () => {
    if (!trimmedUrl) return

    stopPolling()
    setScanResult(null)
    setError(null)
    setIsChecking(true)

    try {
      const { jobId } = await startScan(trimmedUrl)

      const poll = async () => {
        try {
          const result = await getScanResult(jobId)
          if (isTerminal(result.status)) {
            stopPolling()
            setScanResult(result)
            setIsChecking(false)
          }
        } catch (err) {
          stopPolling()
          setIsChecking(false)
          setError(err instanceof Error ? err.message : 'Scan failed')
        }
      }

      await poll()
      pollRef.current = setInterval(poll, POLL_MS)
    } catch (err) {
      setIsChecking(false)
      setError(err instanceof Error ? err.message : 'Failed to start scan')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canSubmit) {
      void handleCheck()
    }
  }

  const handleReset = () => {
    window.location.reload()
  }

  const handleDownloadTxt = () => {
    if (!scanResult) return
    const content = formatResultsAsTxt(scanResult, trimmedUrl)
    downloadTxt(content, scanResultFilename(trimmedUrl))
  }

  const showDownload =
    scanResult != null && !isChecking && isTerminal(scanResult.status)

  return (
    <main className="app">
      <h1 className="title">RepoChecker</h1>

      <div className="scan-row">
        <input
          type="url"
          className="repo-input"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isChecking}
          spellCheck={false}
        />
        <button
          type="button"
          className="check-btn"
          onClick={() => void handleCheck()}
          disabled={!canSubmit}
        >
          Check
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>

      {error ? <p className="status error">{error}</p> : null}

      {isChecking ? <p className="status checking">Checking...</p> : null}

      {scanResult && !isChecking ? (
        <section className="results" aria-live="polite">
          {showDownload ? (
            <div className="results-actions">
              <button
                type="button"
                className="action-btn"
                onClick={handleDownloadTxt}
              >
                Download TXT
              </button>
            </div>
          ) : null}

          {scanResult.status === 'FAILED' ? (
            <p className="status error">
              {scanResult.errorMessage ?? 'Scan failed'}
            </p>
          ) : null}

          {scanResult.status === 'COMPLETED' ? (
            <>
              {(scanResult.findingCount ?? scanResult.findings?.length ?? 0) ===
              0 ? (
                <p className="status success">No issues found</p>
              ) : (
                <ul className="findings-list">
                  {scanResult.findings?.map((finding, index) => (
                    <FindingItem
                      key={`${finding.filePath}-${finding.lineNumber ?? index}-${finding.category}`}
                      finding={finding}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}

export default App
