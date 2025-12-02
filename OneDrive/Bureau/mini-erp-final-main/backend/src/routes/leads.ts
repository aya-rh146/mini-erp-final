import { Hono } from 'hono'

const router = new Hono()
let leads = []

router.get('/', (c) => c.json(leads))

router.post('/', async (c) => {
  const body = await c.req.json()
  const nouveauLead = {
    id: Date.now(),
    ...body,
    statut: 'nouveau',
    dateCreation: new Date().toISOString()
  }
  leads.push(nouveauLead)
  return c.json(nouveauLead)
})

export default router