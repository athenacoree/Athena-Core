import { Model } from 'mongoose';
import type { IEmpresa } from '~/types';
import empresaSchema from '~/schema/empresa';

export function createEmpresaModel(mongoose: typeof import('mongoose')): Model<IEmpresa> {
  return mongoose.models.Empresa || mongoose.model<IEmpresa>('Empresa', empresaSchema);
}
