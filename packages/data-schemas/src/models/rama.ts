import { Model } from 'mongoose';
import type { IRama } from '~/types';
import ramaSchema from '~/schema/rama';

export function createRamaModel(mongoose: typeof import('mongoose')): Model<IRama> {
  return mongoose.models.Rama || mongoose.model<IRama>('Rama', ramaSchema);
}
