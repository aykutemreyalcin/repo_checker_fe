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
      </div>

      {error ? <p className="status error">{error}</p> : null}

      {isChecking ? <p className="status checking">Checking...</p> : null}

      {scanResult && !isChecking ? (
        <section className="results" aria-live="polite">
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
