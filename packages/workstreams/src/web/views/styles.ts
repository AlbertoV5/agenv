export const styles = `
:root {
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  --bg-color: #f8f9fa;
  --text-color: #212529;
  --border-color: #dee2e6;
  --header-bg: #1a1d21;
  --header-text: #ffffff;
  --accent-color: #3b82f6;
  
  /* Status Colors */
  --status-completed: #28a745;   /* Green */
  --status-in-progress: #007bff; /* Blue */
  --status-pending: #6c757d;     /* Gray */
  --status-blocked: #dc3545;     /* Red */
  --status-cancelled: #ffc107;   /* Yellow */
}

body {
  font-family: var(--font-family);
  background-color: var(--bg-color);
  color: var(--text-color);
  margin: 0;
  padding: 0;
  line-height: 1.5;
}

header {
  background-color: var(--header-bg);
  color: var(--header-text);
  padding: 1rem 0;
}

header .header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 1.5rem;
}

nav a {
  color: var(--header-text);
  text-decoration: none;
  font-weight: 500;
}

nav a:hover {
  text-decoration: underline;
}

main {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* Status Badges */
.badge {
  display: inline-block;
  padding: 0.25em 0.6em;
  font-size: 75%;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: 0.25rem;
  color: #fff;
}

.badge-completed { background-color: var(--status-completed); }
.badge-in-progress { background-color: var(--status-in-progress); }
.badge-pending { background-color: var(--status-pending); }
.badge-blocked { background-color: var(--status-blocked); }
.badge-cancelled { background-color: var(--status-cancelled); color: #212529; }

/* Responsive Grid */
@media (max-width: 768px) {
  header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  nav ul {
    gap: 1rem;
  }
}
`;
