import { html } from 'hono/html'
import { styles } from './styles'

export const Header = () => (
  <header>
    <div class="header-content">
      <h1><a href="/" style="color: inherit; text-decoration: none;">Workstream Viz</a></h1>
      <nav>
        <ul>
          <li><a href="/">Dashboard</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </nav>
    </div>
  </header>
)

export const Layout = (props: { title: string; children: any }) => {
  return html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${props.title} - Workstream Viz</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  ${<Header />}
  <main>
    ${props.children}
  </main>
</body>
</html>`
}
