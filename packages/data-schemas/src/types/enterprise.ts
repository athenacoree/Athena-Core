import type { Document } from 'mongoose';

export interface IEmpresa extends Document {
  usuario_id: string;
  nombre: string;
  descripcion?: string;
  presupuesto_total: number;
  presupuesto_gastado: number;
  presupuesto_disponible: number;
  ideas_implementadas: string[];
  fecha_creacion: Date;
  modo_live: boolean;
  modo_autonomo: boolean;
  // Competitive Team Metrics
  equipo_1_score: number;
  equipo_2_score: number;
  supervisor_score: number;
  tesorero_score: number;
  last_report_date?: Date;
}

export interface IRama extends Document {
  empresa_id: any; // Schema.Types.ObjectId or string
  nombre: string;
  fecha: Date;
}

export interface IIdea extends Document {
  rama_id: any; // Schema.Types.ObjectId or string
  nombre: string;
  descripcion: string;
  costo: number;
  roi: number;
  tiempo_meses: number;
  riesgo: 'bajo' | 'medio' | 'alto';
  puntuacion: number;
  implementada: boolean;
  fecha_generacion: Date;
  equipo: 'equipo_1' | 'equipo_2';
}

export interface IAccion extends Document {
  empresa_id: any; // Schema.Types.ObjectId or string
  tipo: string;
  descripcion: string;
  costo: number;
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'fallida';
  fecha: Date;
}
