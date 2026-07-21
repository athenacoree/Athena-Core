import { Schema } from 'mongoose';
import type { IRama } from '~/types';

const ramaSchema: Schema<IRama> = new Schema<IRama>({
  empresa_id: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
    index: true,
  },
  nombre: {
    type: String,
    required: true,
  },
  fecha: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export default ramaSchema;
