import { ServerResponse } from 'http'

export const addEurekaServerMiddleware = () => {
  return [
    {
      path: '/info',
      handler: (_: never, res: ServerResponse) => {
        res.statusCode = 200
        res.end()
      }
    },
    {
      path: '/health',
      handler: (_: never, res: ServerResponse) => {
        res.statusCode = 200
        res.end()
      }
    }
  ]
}
