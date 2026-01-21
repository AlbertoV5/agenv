import { Layout } from './layout'
import type { Task, TaskStatus } from '../../lib/types'

interface TasksViewProps {
  workstreamId: string
  workstreamName: string
  tasks: Task[]
  statusFilter: TaskStatus | null
}

export const TasksView = ({ workstreamId, workstreamName, tasks, statusFilter }: TasksViewProps) => {
  const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'blocked', 'cancelled']

  return (
    <Layout title={`Tasks - ${workstreamName}`}>
      <div class="tasks-header">
        <h2>Tasks for {workstreamName}</h2>
        <div class="filters">
          <span>Filter by status: </span>
          <a href={`/workstream/${workstreamId}/tasks`} class={!statusFilter ? 'active' : ''}>All</a>
          {statuses.map(status => (
            <a 
              href={`/workstream/${workstreamId}/tasks?status=${status}`} 
              class={statusFilter === status ? `active filter-${status}` : `filter-${status}`}
            >
              {status.replace('_', ' ')}
            </a>
          ))}
        </div>
      </div>

      <table class="task-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Stage</th>
            <th>Batch</th>
            <th>Thread</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr>
              <td><code>{task.id}</code></td>
              <td>{task.name}</td>
              <td>{task.stage_name || '-'}</td>
              <td>{task.batch_name || '-'}</td>
              <td>{task.thread_name || '-'}</td>
              <td>
                <span class={`badge badge-${task.status.replace('_', '-')}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </td>
              <td>{task.updated_at ? new Date(task.updated_at).toLocaleString() : '-'}</td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={7} style="text-align: center; padding: 2rem;">No tasks found matching the filter.</td>
            </tr>
          )}
        </tbody>
      </table>

      <style>
        {`
          .tasks-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
          }
          .tasks-header h2 { margin: 0; }
          .filters {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            font-size: 0.9rem;
          }
          .filters a {
            text-decoration: none;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            border: 1px solid var(--border-color);
            color: var(--text-color);
            text-transform: capitalize;
          }
          .filters a.active {
            background-color: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
          }
          
          .task-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .task-table th, .task-table td {
            padding: 0.75rem 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
          }
          .task-table th {
            background-color: #f1f3f5;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
          .task-table tr:last-child td {
            border-bottom: none;
          }
          .task-table tr:hover {
            background-color: #f8f9fa;
          }
          code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 0.85rem;
            background: #f1f3f5;
            padding: 0.1rem 0.3rem;
            border-radius: 4px;
          }
        `}
      </style>
    </Layout>
  )
}
