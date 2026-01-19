import { logProjectInitialized } from './logger/projectInit'
import { app } from './app'

const port = Number(process.env.PORT) || 3000

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
  logProjectInitialized().catch((error) => {
    console.error('Failed to log initialization event', error)
  })
})
