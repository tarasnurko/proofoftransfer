import { createSafeActionClient } from 'next-safe-action'

export const actionClient = createSafeActionClient({
  defaultValidationErrorsShape: 'flattened',
  handleServerError: (e) => {
    return e.message
  },
})
