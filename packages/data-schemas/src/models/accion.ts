import { Model } from 'mongoose';
import type { IAccion } from '~/types';
import accionSchema from '~/schema/accion';

export function createAccionModel(mongoose: typeof import('mongoose')): Model<IAccion> {
  return mongoose.models.Accion || mongoose.model<IAccion>('Accion', accionSchema);
}
