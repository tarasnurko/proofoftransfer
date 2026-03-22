export class EntityNotFoundException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EntityNotFoundException'
    Object.setPrototypeOf(this, EntityNotFoundException.prototype)
  }
}
