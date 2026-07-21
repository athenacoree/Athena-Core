import { Schema } from 'mongoose';
import type { IIdea } from '~/types';

const ideaSchema: Schema<IIdea> = new Schema<IIdea>({
  rama_id: {
    type: Schema.Types.ObjectId,
    ref: 'Rama',
    required: true,
    index: true,
  },
  nombre: {
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
  roi: {
    type: Number,
    required: true,
  },
  tiempo_meses: {
    type: Number,
    required: true,
  },
  riesgo: {
    type: String,
    enum: ['bajo', 'medio', 'alto'],
    required: true,
  },
  puntuacion: {
    type: Number,
    required: true,
  },
  implementada: {
    type: Boolean,
    default: false,
    index: true,
  },
  fecha_generacion: {
    type: Date,
    default: Date.now,
    index: true,
  },
  equipo: {
    type: String,
    enum: ['equipo_1', 'equipo_2'],
    required: true,
  },
});

export default ideaSchema;
