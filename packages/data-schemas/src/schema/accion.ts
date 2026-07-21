import { Schema } from 'mongoose';
import type { IAccion } from '~/types';

const accionSchema: Schema<IAccion> = new Schema<IAccion>({
  empresa_id: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
    index: true,
  },
  tipo: {
    type: String,
    required: true,
  },
  descripcion: {
    type: String,
    required: true,
  },
  costo: {
    type: Number,
    required: true,
  },
  estado: {
    type: String,
    enum: ['pendiente', 'en_progreso', 'completada', 'fallida'],
    default: 'pendiente',
    index: true,
  },
  fecha: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export default accionSchema;
