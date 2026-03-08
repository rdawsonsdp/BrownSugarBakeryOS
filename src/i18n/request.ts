import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => {
  // In non-routing mode, default to 'en'. The client will override via NextIntlClientProvider.
  const locale = 'en'
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
