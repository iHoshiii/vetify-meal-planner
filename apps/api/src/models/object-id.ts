import { ObjectId } from 'mongodb';

export function isValidObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value) && ObjectId.isValid(value);
}
