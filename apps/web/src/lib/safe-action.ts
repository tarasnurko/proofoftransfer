import { createSafeActionClient } from 'next-safe-action'

export const actionClient = createSafeActionClient({
  defaultValidationErrorsShape: 'flattened',
  handleServerError: (e) => {
    console.error('Action error:', e.message)
    return e.message
  },
})
