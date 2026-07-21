import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWhatsAppSession extends Document {
  adminUserId: Types.ObjectId;
  agentId?: string;
  authData?: Record<string, any>;
  interactions?: Array<{
    jid: string;
    pushName?: string;
    conversationId?: string;
    lastInteraction?: Date;
  }>;
  tenantId?: string;
}

const whatsappSessionSchema: Schema<IWhatsAppSession> = new Schema({
  adminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  agentId: {
    type: String,
  },
  authData: {
    type: mongoose.Schema.Types.Mixed,
  },
  interactions: [
    {
      jid: { type: String, required: true },
      pushName: { type: String },
      conversationId: { type: String },
      lastInteraction: { type: Date, default: Date.now },
    },
  ],
  tenantId: {
    type: String,
    index: true,
  },
}, {
  timestamps: true,
});

export default whatsappSessionSchema;
