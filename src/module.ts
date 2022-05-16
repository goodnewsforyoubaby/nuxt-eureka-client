import { resolve } from 'path'
import { Eureka } from 'eureka-js-client'
import { Module } from '@nuxt/types'

interface Route {
  path: string
  appId: string
}

interface ModuleOptions {
  enabled: boolean
  appName: string
  eurekaHostname: string
  eurekaPort: number
  eurekaRoutes: string
}

interface EurekaOptions extends ModuleOptions {
  selfHostname: string
  selfPort: number
}

const nextIndex: { [k: string]: number } = {}

const createEurekaClient = (options: EurekaOptions) => {
  const url = `http://${options.selfHostname}:${options.selfPort}`
  return new Eureka({
    shouldUseDelta: true,
    instance: {
      app: options.appName,
      hostName: options.selfHostname,
      ipAddr: options.selfHostname,
      port: { $: options.selfPort, '@enabled': true },
      vipAddress: options.appName,
      statusPageUrl: `${url}/info`,
      healthCheckUrl: `${url}/health`,
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn'
      }
    },
    eureka: { host: options.eurekaHostname, port: options.eurekaPort, servicePath: '/eureka/apps/' }
  })
}

const getNextInstanceByUrl = (routes: Route[], eureka: Eureka) => (url: string) => {
  try {
    const route = routes.find(({ path }) => url.startsWith(path))
    if (route === undefined) {
      return null
    }
    const { path, appId } = route
    const instances = eureka.getInstancesByAppId(appId)
    nextIndex[path] ??= 0
    if (nextIndex[path] > instances.length - 1) {
      nextIndex[path] = 0
    }
    return { service: instances[nextIndex[path]++], prefix: path }
  } catch {
    return null
  }
}

const getRoutes = (eurekaRoutes: string): Route[] => {
  return eurekaRoutes.split(',').map((route) => {
    const [path, appId] = route.split(':')
    return { path, appId }
  })
}

const eurekaModule: Module<ModuleOptions> = function (options: ModuleOptions) {
  if (!options.enabled) {
    return
  }

  const { nuxt, addPlugin } = this

  let eureka: Eureka | null
  const routes = getRoutes(options.eurekaRoutes)

  addPlugin({
    src: resolve(__dirname, './plugin.js'),
    fileName: 'eureka.js',
    mode: 'server'
  })

  nuxt.hook('listen', (_: any, { host, port }: any) => {
    eureka = createEurekaClient({ ...options, selfHostname: host, selfPort: port })
    eureka.start()

    const $eureka = { getNextInstanceByUrl: getNextInstanceByUrl(routes, eureka) }
    nuxt.hook('vue-renderer:ssr:prepareContext', (ssrContext: any) => {
      ssrContext.$eureka = $eureka
    })
  })

  nuxt.hook('close', () => {
    eureka?.stop(() => (eureka = null))
  })
}

export default eurekaModule
