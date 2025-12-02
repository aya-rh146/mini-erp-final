import { Hono } from 'hono'

const router = new Hono()

router.post('/login', async (c) => {
  return c.json({
    token: 'aya-2025-success',
    utilisateur: { id: 1, email: 'admin@erp.com', role: 'admin' }
  })
})

export default router