import { Layout } from './layout'
import { StatusBadge, ProgressBar } from './dashboard'
import type { WorkstreamDetail, GroupedTasks } from '../data-service'
import type { Task } from '../../lib/types.ts'

export const TaskItem = ({ task }: { task: Task }) => {
  return (
    <div class="task-item" style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid #eee;">
      <StatusBadge status={task.status} />
      <div style="flex: 1;">
        <div style="font-size: 0.95rem; font-weight: 500;">{task.name}</div>
        <div style="font-size: 0.75rem; color: #888; margin-top: 0.1rem;">{task.id}</div>
        {task.report && (
           <div style="font-size: 0.85rem; color: #444; margin-top: 0.4rem; padding: 0.5rem; background: #f9f9f9; border-radius: 4px; border-left: 2px solid #ddd;">
             {task.report}
           </div>
        )}
      </div>
    </div>
  )
}

export const ThreadItem = ({ name, tasks }: { name: string, tasks: Task[] }) => {
  const completed = tasks.filter(t => t.status === 'completed').length
  const total = tasks.length
  
  return (
    <div class="thread-item" style="margin-top: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; background: #f1f3f5; padding: 0.4rem 0.75rem; border-radius: 4px;">
        <h4 style="margin: 0; font-size: 0.95rem; color: #495057;">{name}</h4>
        <span style="font-size: 0.8rem; color: #6c757d; font-weight: 600;">{completed}/{total} tasks</span>
      </div>
      <div class="tasks-list" style="padding: 0 0.5rem;">
        {tasks.map(task => <TaskItem task={task} />)}
      </div>
    </div>
  )
}

export const BatchItem = ({ name, threads }: { name: string, threads: { [threadName: string]: Task[] } }) => {
  return (
    <div class="batch-item" style="margin-top: 2rem; border-left: 4px solid #e9ecef; padding-left: 1.25rem;">
      <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem; color: #343a40; text-transform: capitalize; display: flex; align-items: center; gap: 0.5rem;">
        <span style="background: #e9ecef; width: 8px; height: 8px; border-radius: 50%;"></span>
        {name.replace(/^[0-9]+-/, '').replace(/-/g, ' ')}
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem;">
        {Object.entries(threads).map(([threadName, tasks]) => (
          <ThreadItem name={threadName} tasks={tasks} />
        ))}
      </div>
    </div>
  )
}

export const StageItem = ({ name, batches }: { name: string, batches: { [batchName: string]: { [threadName: string]: Task[] } } }) => {
  const allTasks = Object.values(batches).flatMap(b => Object.values(b).flat())
  const completed = allTasks.filter(t => t.status === 'completed').length
  const total = allTasks.length
  
  return (
    <details class="stage-item" style="margin-bottom: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: #fff;" open>
      <summary style="padding: 1.25rem; background: #f8f9fa; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; list-style: none;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.25rem;">{name}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 1.5rem;">
          <div style="text-align: right;">
            <div style="font-size: 0.85rem; color: #495057;">{completed}/{total} tasks</div>
            <div style="width: 100px; background: #e9ecef; height: 4px; border-radius: 2px; margin-top: 4px; overflow: hidden;">
              <div style={`width: ${total > 0 ? (completed/total)*100 : 0}%; background: var(--status-completed); height: 100%;`}></div>
            </div>
          </div>
          <span style="font-size: 1.2rem; color: #adb5bd;">▾</span>
        </div>
      </summary>
      <style>
        {`
          details.stage-item summary::-webkit-details-marker { display: none; }
          details.stage-item[open] summary span:last-child { transform: rotate(180deg); }
        `}
      </style>
      <div style="padding: 0.5rem 1.5rem 2rem 1.5rem;">
        {Object.entries(batches).map(([batchName, threads]) => (
          <BatchItem name={batchName} threads={threads} />
        ))}
      </div>
    </details>
  )
}

export const WorkstreamPage = ({ stream, tasks }: { stream: WorkstreamDetail, tasks: GroupedTasks }) => {
  return (
    <Layout title={`${stream.name} - Details`}>
      <div style="margin-bottom: 2.5rem;">
        <nav style="margin-bottom: 1.5rem;">
          <a href="/" style="color: var(--accent-color); text-decoration: none; font-size: 0.9rem; display: flex; align-items: center; gap: 0.4rem;">
            <span>←</span> Back to Dashboard
          </a>
        </nav>
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1.5rem;">
          <div>
            <h1 style="font-size: 2.25rem; margin: 0; letter-spacing: -0.025em;">{stream.name}</h1>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.75rem;">
              <StatusBadge status={stream.status} />
              <span style="font-size: 0.95rem; color: #6c757d; font-family: monospace; background: #f1f3f5; padding: 0.1rem 0.4rem; border-radius: 4px;">{stream.id}</span>
              {stream.is_current && (
                <span class="badge badge-in-progress">CURRENT</span>
              )}
            </div>
          </div>
          
          <div style="text-align: right; min-width: 200px;">
            {stream.approval && (
              <div style="margin-bottom: 0.75rem; background: #fff; padding: 0.5rem 1rem; border: 1px solid var(--border-color); border-radius: 6px; display: inline-block; text-align: left;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #6c757d; font-weight: 700; margin-bottom: 0.25rem;">Approval Status</div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class={`badge badge-${stream.approval.status}`}>{stream.approval.status.toUpperCase()}</span>
                  {stream.approval.approved_by && <span style="font-size: 0.85rem; color: #495057;">by {stream.approval.approved_by}</span>}
                </div>
              </div>
            )}
            <div style="font-size: 0.85rem; color: #6c757d; margin-top: 0.5rem;">
              Created {new Date(stream.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </div>
          </div>
        </div>
      </div>
      
      <div class="card" style="margin-bottom: 3rem; background: #fff; border: 1px solid var(--border-color); border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <h2 style="margin: 0 0 1.5rem 0; font-size: 1.25rem; color: #343a40;">Progress Summary</h2>
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 1.1rem; margin-bottom: 0.75rem;">
          <span style="font-weight: 700; color: var(--accent-color); font-size: 1.5rem;">{stream.progress.percent_complete}%</span>
          <span style="color: #6c757d;">{stream.progress.completed_tasks} of {stream.progress.total_tasks} tasks completed</span>
        </div>
        <ProgressBar percent={stream.progress.percent_complete} />
        
        <div style="display: flex; flex-wrap: wrap; gap: 2rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #f1f3f5;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 12px; height: 12px; background: var(--status-completed); border-radius: 3px;"></div>
            <span style="font-size: 0.9rem; color: #495057;"><span style="font-weight: 600;">{stream.progress.completed_tasks}</span> Completed</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 12px; height: 12px; background: var(--status-in-progress); border-radius: 3px;"></div>
            <span style="font-size: 0.9rem; color: #495057;"><span style="font-weight: 600;">{stream.progress.in_progress_tasks}</span> In Progress</span>
          </div>
          {stream.progress.blocked_tasks > 0 && (
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 12px; height: 12px; background: var(--status-blocked); border-radius: 3px;"></div>
              <span style="font-size: 0.9rem; color: #495057;"><span style="font-weight: 600;">{stream.progress.blocked_tasks}</span> Blocked</span>
            </div>
          )}
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 12px; height: 12px; background: var(--status-pending); border-radius: 3px;"></div>
            <span style="font-size: 0.9rem; color: #495057;"><span style="font-weight: 600;">{stream.progress.pending_tasks}</span> Pending</span>
          </div>
        </div>
      </div>
      
      <div class="execution-plan">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="margin: 0; font-size: 1.5rem; color: #212529;">Execution Plan</h2>
        </div>
        
        {Object.entries(tasks.grouped).length > 0 ? (
          Object.entries(tasks.grouped).map(([stageName, batches]) => (
            <StageItem name={stageName} batches={batches} />
          ))
        ) : (
          <div style="padding: 3rem; text-align: center; background: #fff; border: 1px dashed var(--border-color); border-radius: 8px; color: #6c757d;">
            No tasks found for this workstream.
          </div>
        )}
      </div>
    </Layout>
  )
}
