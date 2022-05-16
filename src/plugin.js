export default function ({ ssrContext, $axios }) {
  const { $eureka } = ssrContext
  $axios.onRequest((request) => {
    const config = $eureka.getNextInstanceByUrl(request.url)
    if (config !== null && request.url != null) {
      const url = new URL(request.url.replace(config.prefix, ''), config.service.homePageUrl)
      request.url = url.toString()
    }
  })
}
