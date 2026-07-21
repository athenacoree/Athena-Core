import { Model } from 'mongoose';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import whatsappSessionSchema, { IWhatsAppSession } from '~/schema/whatsappSession';

export function createWhatsAppSessionModel(
  mongoose: typeof import('mongoose'),
): Model<IWhatsAppSession> {
  applyTenantIsolation(whatsappSessionSchema);
  return (
    mongoose.models.WhatsAppSession ||
    mongoose.model<IWhatsAppSession>('WhatsAppSession', whatsappSessionSchema)
  );
}
