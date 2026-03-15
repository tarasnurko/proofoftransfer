const PORT = process.env.NEXT_PUBLIC_PORT || '3000'

export const BASE_URL = `http://localhost:${PORT}`

export const LAUNCH_OPTIONS = {
  args: ['--window-position=0,0', '--window-size=9999,9999'],
}

