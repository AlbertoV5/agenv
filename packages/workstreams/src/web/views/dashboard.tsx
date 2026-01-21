import { Layout } from './layout'
import type { WorkstreamSummary } from '../data-service'

export const StatusBadge = ({ status }: { status: string }) => {
  const badgeClass = `badge badge-${status.toLowerCase().replace(/_/g, '-')}`
  return <span class={badgeClass}>{status}</span>
}

export const ProgressBar = ({ percent }: { percent: number }) => {
  return (
    <div class="progress-container" style="background: #eee; border-radius: 4px; height: 8px; margin: 10px 0; overflow: hidden;">
      <div 
        class="progress-bar" 
        style={`background: var(--status-completed); height: 100%; width: ${percent}%`}
      ></div>
    </div>
  )
}

export const WorkstreamCard = ({ stream }: { stream: WorkstreamSummary }) => {
  const total = stream.task_counts.total
  const completed = stream.task_counts.completed
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  
  return (
    <div class="card" style="background: #fff; border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; position: relative;">
      {stream.is_current && (
        <span class="badge badge-in-progress" style="position: absolute; top: 1rem; right: 1rem;">CURRENT</span>
      )}
      <h2 style="margin: 0; font-size: 1.25rem;">
        <a href={`/workstream/${stream.id}`} style="color: var(--accent-color); text-decoration: none;">{stream.name}</a>
      </h2>
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <StatusBadge status={stream.status} />
        <span style="font-size: 0.875rem; color: #666;">{stream.id}</span>
      </div>
      
      <div style="margin-top: auto;">
        <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.25rem;">
          <span>Progress</span>
          <span>{percent}%</span>
        </div>
        <ProgressBar percent={percent} />
        <div style="display: flex; gap: 1rem; font-size: 0.75rem; color: #666; margin-top: 0.5rem;">
          <span>{stream.task_counts.completed} / {stream.task_counts.total} tasks</span>
          {stream.task_counts.in_progress > 0 && (
            <span style="color: var(--status-in-progress);">{stream.task_counts.in_progress} in progress</span>
          )}
        </div>
      </div>
    </div>
  )
}

export const Dashboard = ({ workstreams, currentStreamId }: { workstreams: WorkstreamSummary[], currentStreamId?: string }) => {
  return (
    <Layout title="Dashboard">
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 2rem; margin-bottom: 0.5rem;">Workstreams Overview</h1>
        <p style="color: #666;">Track progress across all active and planned workstreams.</p>
      </div>
      
      <div class="container">
        {workstreams
          .sort((a, b) => a.order - b.order)
          .map((stream) => (
            <WorkstreamCard stream={stream} />
          ))}
      </div>
    </Layout>
  )
}
