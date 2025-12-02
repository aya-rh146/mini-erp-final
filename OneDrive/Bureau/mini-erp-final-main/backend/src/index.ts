import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'

const app = new Hono()

app.use('*', cors())

// Login qui marche à tous les coups (même champs vides)
app.post('/api/auth/login', (c) => {
  return c.json({
    token: 'aya-la-reine-2025',
    utilisateur: { id: 1, nom: 'Aya', role: 'admin', email: 'admin@erp.com' }
  })
})

app.get('/', (c) => c.text('Backend KHADDAM 100% sur le port 3001 ❤️'))

serve({
  fetch: app.fetch,
  port: 3001
}, () => {
  console.log('🚀 Backend démarré → http://localhost:3001')
})