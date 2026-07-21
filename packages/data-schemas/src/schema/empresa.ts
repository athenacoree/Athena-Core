import { Schema } from 'mongoose';
import type { IEmpresa } from '~/types';

const empresaSchema: Schema<IEmpresa> = new Schema<IEmpresa>({
  usuario_id: {
    type: String,
    required: true,
    index: true,
  },
  nombre: {
    type: String,
    required: true,
  },
  descripcion: {
    type: String,
  },
  presupuesto_total: {
    type: Number,
    default: 0,
  },
  presupuesto_gastado: {
    type: Number,
    default: 0,
  },
  presupuesto_disponible: {
    type: Number,
    default: 0,
  },
  ideas_implementadas: {
    type: [String],
    default: [],
  },
  modo_live: {
    type: Boolean,
    default: false,
  },
  modo_autonomo: {
    type: Boolean,
    default: false,
  },
  equipo_1_score: {
    type: Number,
    default: 0,
  },
  equipo_2_score: {
    type: Number,
    default: 0,
  },
  supervisor_score: {
    type: Number,
    default: 0,
  },
  tesorero_score: {
    type: Number,
    default: 0,
  },
  last_report_date: {
    type: Date,
  },
}, {
  timestamps: { createdAt: 'fecha_creacion', updatedAt: 'updatedAt' },
});

export default empresaSchema;
