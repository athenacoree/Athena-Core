import mongoose from 'mongoose';
import { logger } from '@librechat/data-schemas';
import type { IEmpresa, IRama, IIdea, IAccion } from '@librechat/data-schemas';

// Default corporate growth branches
const BRANCH_POOL = [
  'Producto',
  'Marketing',
  'Operaciones',
  'Expansión',
  'Tecnología',
  'Finanzas',
  'RRHH',
  'Sostenibilidad',
  'Digitalización',
  'Experiencia de Cliente'
];

// Helper to select random elements from an array
function selectRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Simulated Agent Experts to compute decisions and ideas
export class EnterpriseAIService {
  /**
   * Register a company and configure the budget
   */
  static async registerCompany(userId: string, name: string, description?: string, budgetTotal = 0): Promise<IEmpresa> {
    const Empresa = mongoose.models.Empresa;

    // Check if company already exists for user
    let empresa = await Empresa.findOne({ usuario_id: userId }) as IEmpresa | null;

    if (empresa) {
      empresa.nombre = name;
      if (description) empresa.descripcion = description;
      empresa.presupuesto_total = budgetTotal;
      empresa.presupuesto_disponible = budgetTotal - empresa.presupuesto_gastado;
      await empresa.save();
    } else {
      empresa = await Empresa.create({
        usuario_id: userId,
        nombre: name,
        descripcion: description || 'Digital Enterprise Conglomerate',
        presupuesto_total: budgetTotal,
        presupuesto_gastado: 0,
        presupuesto_disponible: budgetTotal,
        ideas_implementadas: [],
        modo_live: false,
        modo_autonomo: false,
        equipo_1_score: 0,
        equipo_2_score: 0,
        supervisor_score: 0,
        tesorero_score: 0
      }) as IEmpresa;
    }

    return empresa;
  }

  /**
   * Get company state
   */
  static async getCompany(userId: string): Promise<IEmpresa | null> {
    const Empresa = mongoose.models.Empresa;
    return await Empresa.findOne({ usuario_id: userId }) as IEmpresa | null;
  }

  /**
   * Update company budget
   */
  static async updateBudget(userId: string, budgetTotal: number): Promise<IEmpresa> {
    const Empresa = mongoose.models.Empresa;
    const empresa = await Empresa.findOne({ usuario_id: userId }) as IEmpresa | null;
    if (!empresa) {
      throw new Error('Empresa no encontrada para el usuario.');
    }
    empresa.presupuesto_total = budgetTotal;
    empresa.presupuesto_disponible = budgetTotal - empresa.presupuesto_gastado;
    await empresa.save();
    return empresa;
  }

  /**
   * Generate 3 branches using the Estratega agent
   */
  static async generateBranches(empresaId: string): Promise<IRama[]> {
    const Rama = mongoose.models.Rama;

    // Use "Estratega" agent logic (simulated) to pick 3 random growth areas
    const chosenBranches = selectRandom(BRANCH_POOL, 3);

    const ramas: IRama[] = [];
    for (const name of chosenBranches) {
      const rama = await Rama.create({
        empresa_id: empresaId,
        nombre: name,
        fecha: new Date()
      }) as IRama;
      ramas.push(rama);
    }

    return ramas;
  }

  /**
   * Generate 3 competing ideas per branch (9 ideas total: Team 1 vs Team 2)
   */
  static async generateIdeas(ramas: IRama[]): Promise<IIdea[]> {
    const Idea = mongoose.models.Idea;
    const generatedIdeas: IIdea[] = [];

    // Simulated "Creativo" Agent Team 1 and Team 2 generation
    const templates: Record<string, Array<{ name: string; desc: string; costo: number; roi: number; tiempo_meses: number; riesgo: 'bajo' | 'medio' | 'alto' }>> = {
      'Producto': [
        { name: 'Nueva línea ecológica', desc: 'Desarrollar productos usando materiales 100% biodegradables.', costo: 3500, roi: 2.5, tiempo_meses: 6, riesgo: 'bajo' },
        { name: 'Suscripción Premium Plus', desc: 'Lanzar un plan de suscripción de alto valor con soporte 24/7.', costo: 1200, roi: 4.0, tiempo_meses: 2, riesgo: 'bajo' },
        { name: 'Empaque inteligente NFC', desc: 'Agregar etiquetas NFC al empaque para contenido interactivo.', costo: 8000, roi: 1.8, tiempo_meses: 9, riesgo: 'alto' }
      ],
      'Marketing': [
        { name: 'Campaña Viral TikTok', desc: 'Crear desafíos y colaborar con micro-influencers de la industria.', costo: 1500, roi: 3.5, tiempo_meses: 1, riesgo: 'bajo' },
        { name: 'SEO de Contenido Automatizado', desc: 'Implementar blogs generados por IA optimizados para SEO local.', costo: 500, roi: 5.0, tiempo_meses: 3, riesgo: 'bajo' },
        { name: 'Anuncios hiper-personalizados', desc: 'Usar algoritmos predictivos para segmentación extrema de leads.', costo: 5000, roi: 2.1, tiempo_meses: 4, riesgo: 'medio' }
      ],
      'Operaciones': [
        { name: 'Logística de entrega express', desc: 'Contratar mensajeros dedicados para entrega en menos de 2 horas.', costo: 4000, roi: 1.5, tiempo_meses: 3, riesgo: 'medio' },
        { name: 'Automatización de Facturas', desc: 'Integrar RPA para procesar cuentas por cobrar automáticamente.', costo: 2000, roi: 3.0, tiempo_meses: 2, riesgo: 'bajo' },
        { name: 'Inventario predictivo con IA', desc: 'Sincronizar stock basado en tendencias y clima.', costo: 6000, roi: 2.4, tiempo_meses: 5, riesgo: 'medio' }
      ],
      'Expansión': [
        { name: 'Franquicia Digital exprés', desc: 'Licenciar marca para distribuidores autorizados en línea.', costo: 3000, roi: 3.2, tiempo_meses: 4, riesgo: 'medio' },
        { name: 'Nueva sucursal metropolitana', desc: 'Abrir un local físico de experiencia en zona comercial de alta gama.', costo: 25000, roi: 1.6, tiempo_meses: 12, riesgo: 'alto' },
        { name: 'Alianza de Cobranding nacional', desc: 'Asociarse con cadena líder para vender combos exclusivos.', costo: 5000, roi: 2.8, tiempo_meses: 3, riesgo: 'bajo' }
      ],
      'Tecnología': [
        { name: 'Migración a nube serverless', desc: 'Reducir costos de infraestructura migrando a AWS Lambda.', costo: 4500, roi: 3.2, tiempo_meses: 4, riesgo: 'bajo' },
        { name: 'Asistente IA de servicio al cliente', desc: 'Integrar agente conversacional avanzado en portal web.', costo: 1500, roi: 4.5, tiempo_meses: 2, riesgo: 'bajo' },
        { name: 'App nativa iOS/Android', desc: 'Desarrollar app multiplataforma con pagos de un toque.', costo: 12000, roi: 2.0, tiempo_meses: 8, riesgo: 'medio' }
      ]
    };

    const defaultTemplates = [
      { name: 'Optimización de flujo', desc: 'Mejorar procesos internos.', costo: 1000, roi: 2.0, tiempo_meses: 2, riesgo: 'bajo' as const },
      { name: 'Capacitación del personal', desc: 'Entrenar equipos de venta.', costo: 1500, roi: 1.8, tiempo_meses: 1, riesgo: 'bajo' as const },
      { name: 'Rediseño de marca', desc: 'Modernizar identidad visual.', costo: 5000, roi: 2.5, tiempo_meses: 4, riesgo: 'medio' as const }
    ];

    for (const rama of ramas) {
      const ramaName = rama.nombre;
      const tps = templates[ramaName] || defaultTemplates;

      // We generate 3 ideas per branch
      for (let i = 0; i < 3; i++) {
        const tp = tps[i % tps.length];

        // Alternate between Team 1 and Team 2 to create the competitive element!
        const team: 'equipo_1' | 'equipo_2' = (i % 2 === 0) ? 'equipo_1' : 'equipo_2';

        // Financiero Agent adjusts ROI/Costo, Auditor calculates Puntuacion (Simulated interaction)
        const adjustedCosto = tp.costo * (0.9 + Math.random() * 0.2); // +/- 10%
        const adjustedROI = tp.roi * (0.85 + Math.random() * 0.3); // ROI adjustment
        const riskScoreMap = { 'bajo': 3, 'medio': 6, 'alto': 9 };
        const rawScore = (adjustedROI * 3) - (riskScoreMap[tp.riesgo] * 0.4) + (10 / tp.tiempo_meses);
        const finalPuntuacion = Math.min(Math.max(Number(rawScore.toFixed(1)), 1.0), 10.0);

        const idea = await Idea.create({
          rama_id: rama._id,
          nombre: `${tp.name} (${team === 'equipo_1' ? 'Squad Alfa' : 'Squad Beta'})`,
          descripcion: tp.desc,
          costo: Number(adjustedCosto.toFixed(2)),
          roi: Number(adjustedROI.toFixed(2)),
          tiempo_meses: tp.tiempo_meses,
          riesgo: tp.riesgo,
          puntuacion: finalPuntuacion,
          implementada: false,
          fecha_generacion: new Date(),
          equipo: team
        }) as IIdea;

        generatedIdeas.push(idea);
      }
    }

    return generatedIdeas;
  }

  /**
   * Get 3 specific ideas on a user-requested custom topic (e.g. "café orgánico")
   */
  static async generateIdeasOnTopic(userId: string, tema: string): Promise<IIdea[]> {
    const Empresa = mongoose.models.Empresa;
    const Rama = mongoose.models.Rama;
    const Idea = mongoose.models.Idea;

    const empresa = await Empresa.findOne({ usuario_id: userId }) as IEmpresa | null;
    if (!empresa) {
      throw new Error('Primero crea tu empresa diciendo "Quiero crear mi empresa [nombre]"');
    }

    // Create a virtual branch for this custom theme
    const rama = await Rama.create({
      empresa_id: empresa._id,
      nombre: `Tema: ${tema.substring(0, 50)}`,
      fecha: new Date()
    }) as IRama;

    const topicIdeas = [
      {
        nombre: `Lanzamiento de branding especializado para ${tema}`,
        desc: `Crear una narrativa de marca enfocada en las propiedades únicas de ${tema} para el sector premium.`,
        costo: 2500,
        roi: 3.2,
        tiempo: 3,
        riesgo: 'bajo' as const
      },
      {
        nombre: `Canal de distribución directo al consumidor para ${tema}`,
        desc: `Lanzar e-commerce especializado y suscripción mensual para enviar ${tema} fresco.`,
        costo: 4800,
        roi: 4.5,
        tiempo: 4,
        riesgo: 'medio' as const
      },
      {
        nombre: `Campañas automatizadas con influencers apasionados por ${tema}`,
        desc: `Socio de contenido para educar al público sobre los beneficios de ${tema} en canales de estilo de vida.`,
        costo: 1200,
        roi: 2.8,
        tiempo: 2,
        riesgo: 'bajo' as const
      }
    ];

    const results: IIdea[] = [];
    for (let i = 0; i < topicIdeas.length; i++) {
      const tp = topicIdeas[i];
      const team: 'equipo_1' | 'equipo_2' = (i % 2 === 0) ? 'equipo_1' : 'equipo_2';
      const score = Number((3.0 + tp.roi * 1.5 - (tp.riesgo === 'medio' ? 1 : 0)).toFixed(1));

      const idea = await Idea.create({
        rama_id: rama._id,
        nombre: `${tp.nombre} (${team === 'equipo_1' ? 'Squad Alfa' : 'Squad Beta'})`,
        descripcion: tp.desc,
        costo: tp.costo,
        roi: tp.roi,
        tiempo_meses: tp.tiempo,
        riesgo: tp.riesgo,
        puntuacion: score,
        implementada: false,
        fecha_generacion: new Date(),
        equipo: team
      }) as IIdea;

      results.push(idea);
    }

    return results;
  }

  /**
   * Run competitive squad simulation: alpha vs beta battle and ROI audit
   */
  static async runCompetitiveSquadBattle(userId: string): Promise<{
    winner: 'equipo_1' | 'equipo_2' | 'empate';
    alphaAvgScore: number;
    betaAvgScore: number;
    supervisorReview: string;
    metrics: any;
  }> {
    const Empresa = mongoose.models.Empresa;
    const Rama = mongoose.models.Rama;
    const Idea = mongoose.models.Idea;

    const empresa = await Empresa.findOne({ usuario_id: userId }) as IEmpresa | null;
    if (!empresa) {
      throw new Error('Empresa no encontrada.');
    }

    // Grab ideas from the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRamas = await Rama.find({ empresa_id: empresa._id, fecha: { $gte: yesterday } });
    const ramaIds = recentRamas.map(r => r._id);

    const recentIdeas = await Idea.find({ rama_id: { $in: ramaIds } }) as IIdea[];

    let team1Count = 0, team2Count = 0;
    let team1Sum = 0, team2Sum = 0;
    let team1RoiSum = 0, team2RoiSum = 0;

    for (const idea of recentIdeas) {
      if (idea.equipo === 'equipo_1') {
        team1Count++;
        team1Sum += idea.puntuacion;
        team1RoiSum += idea.roi;
      } else {
        team2Count++;
        team2Sum += idea.puntuacion;
        team2RoiSum += idea.roi;
      }
    }

    // In case there are no recent ideas, create a few simulated mock values for the battle
    const alphaAvgScore = team1Count > 0 ? Number((team1Sum / team1Count).toFixed(2)) : Number((7.0 + Math.random() * 2).toFixed(2));
    const betaAvgScore = team2Count > 0 ? Number((team2Sum / team2Count).toFixed(2)) : Number((7.0 + Math.random() * 2).toFixed(2));

    const alphaAvgRoi = team1Count > 0 ? Number((team1RoiSum / team1Count).toFixed(2)) : Number((2.0 + Math.random() * 2).toFixed(2));
    const betaAvgRoi = team2Count > 0 ? Number((team2RoiSum / team2Count).toFixed(2)) : Number((2.0 + Math.random() * 2).toFixed(2));

    let winner: 'equipo_1' | 'equipo_2' | 'empate' = 'empate';
    if (alphaAvgScore > betaAvgScore) {
      winner = 'equipo_1';
      empresa.equipo_1_score += 10;
    } else if (betaAvgScore > alphaAvgScore) {
      winner = 'equipo_2';
      empresa.equipo_2_score += 10;
    } else {
      empresa.equipo_1_score += 5;
      empresa.equipo_2_score += 5;
    }

    // Treasurer / Supervisor notes
    empresa.supervisor_score = Number(((empresa.supervisor_score || 80) + (Math.random() * 4 - 2)).toFixed(1));
    empresa.tesorero_score = Number(((empresa.tesorero_score || 85) + (Math.random() * 4 - 2)).toFixed(1));
    await empresa.save();

    const supervisorReview = winner === 'equipo_1'
      ? `Supervisor: El Equipo 1 (Squad Alfa) supera a Beta gracias a propuestas altamente viables con puntuación de ${alphaAvgScore} y ROI promedio de ${alphaAvgRoi}x. Beta necesita mejorar la mitigación de riesgos.`
      : winner === 'equipo_2'
      ? `Supervisor: El Equipo 2 (Squad Beta) se lleva la victoria con un desempeño excelente de ${betaAvgScore} y un ROI competitivo de ${betaAvgRoi}x. Las ideas de Alfa fueron creativas pero costosas.`
      : `Supervisor: Disputa extremadamente reñida. Ambos equipos presentaron propuestas del más alto calibre corporativo (Alfa: ${alphaAvgScore}, Beta: ${betaAvgScore}). Se declara empate técnico de operaciones.`;

    return {
      winner,
      alphaAvgScore,
      betaAvgScore,
      supervisorReview,
      metrics: {
        alphaAvgRoi,
        betaAvgRoi,
        equipo_1_cumulative_score: empresa.equipo_1_score,
        equipo_2_cumulative_score: empresa.equipo_2_score
      }
    };
  }

  /**
   * Implement / Spend Budget on an Idea
   */
  static async implementIdea(userId: string, ideaId: string): Promise<{ idea: IIdea; empresa: IEmpresa }> {
    const Empresa = mongoose.models.Empresa;
    const Idea = mongoose.models.Idea;

    const idea = await Idea.findById(ideaId) as IIdea | null;
    if (!idea) {
      throw new Error('Idea no encontrada.');
    }

    if (idea.implementada) {
      throw new Error('Esta idea ya ha sido implementada.');
    }

    const empresa = await Empresa.findOne({ usuario_id: userId }) as IEmpresa | null;
    if (!empresa) {
      throw new Error('Empresa no encontrada.');
    }

    // Check budget availability
    if (idea.costo > empresa.presupuesto_disponible) {
      throw new Error(`Presupuesto insuficiente. Costo de la idea ($${idea.costo}) excede el presupuesto disponible ($${empresa.presupuesto_disponible})`);
    }

    // Deduct and implement
    empresa.presupuesto_gastado = Number((empresa.presupuesto_gastado + idea.costo).toFixed(2));
    empresa.presupuesto_disponible = Number((empresa.presupuesto_total - empresa.presupuesto_gastado).toFixed(2));

    if (!empresa.ideas_implementadas.includes(idea.nombre)) {
      empresa.ideas_implementadas.push(idea.nombre);
    }

    idea.implementada = true;

    await empresa.save();
    await idea.save();

    // Create an automatically completed real-world action representing this implementation
    const Accion = mongoose.models.Accion;
    await Accion.create({
      empresa_id: empresa._id,
      tipo: 'implementacion_idea',
      descripcion: `Ejecución e implementación exitosa del proyecto corporativo: ${idea.nombre}.`,
      costo: idea.costo,
      estado: 'completada',
      fecha: new Date()
    });

    return { idea, empresa };
  }

  /**
   * Trigger Real-world Action execution
   */
  static async createAction(userId: string, tipo: string, descripcion: string, costo: number): Promise<IAccion> {
    const Empresa = mongoose.models.Empresa;
    const Accion = mongoose.models.Accion;

    const empresa = await Empresa.findOne({ usuario_id: userId }) as IEmpresa | null;
    if (!empresa) {
      throw new Error('Empresa no encontrada para el usuario.');
    }

    if (costo > empresa.presupuesto_disponible) {
      throw new Error(`Acción rechazada. El costo ($${costo}) supera el presupuesto disponible ($${empresa.presupuesto_disponible})`);
    }

    // Deduct budget
    empresa.presupuesto_gastado = Number((empresa.presupuesto_gastado + costo).toFixed(2));
    empresa.presupuesto_disponible = Number((empresa.presupuesto_total - empresa.presupuesto_gastado).toFixed(2));
    await empresa.save();

    const action = await Accion.create({
      empresa_id: empresa._id,
      tipo,
      descripcion,
      costo,
      estado: 'pendiente',
      fecha: new Date()
    }) as IAccion;

    // Simulate real-world progress: if in autonomous/live mode, execute immediately!
    if (empresa.modo_live || empresa.modo_autonomo) {
      action.estado = 'en_progreso';
      await action.save();

      // Simulate success 85% of time
      setTimeout(async () => {
        try {
          const finishedAction = await Accion.findById(action._id) as IAccion | null;
          if (finishedAction) {
            finishedAction.estado = Math.random() < 0.9 ? 'completada' : 'fallida';
            await finishedAction.save();
          }
        } catch (err) {
          logger.error('Error actualizando estado de acción simulada', err);
        }
      }, 3000);
    }

    return action;
  }

  /**
   * Update action status manually
   */
  static async updateActionStatus(actionId: string, estado: 'pendiente' | 'en_progreso' | 'completada' | 'fallida'): Promise<IAccion> {
    const Accion = mongoose.models.Accion;
    const action = await Accion.findById(actionId) as IAccion | null;
    if (!action) {
      throw new Error('Acción no encontrada.');
    }
    action.estado = estado;
    await action.save();
    return action;
  }

  /**
   * Toggle Modes (LIVE or AUTONOMOUS)
   */
  static async toggleModes(userId: string, mode: 'live' | 'autonomo', value: boolean): Promise<IEmpresa> {
    const Empresa = mongoose.models.Empresa;
    const empresa = await Empresa.findOne({ usuario_id: userId }) as IEmpresa | null;
    if (!empresa) {
      throw new Error('Empresa no encontrada.');
    }

    if (mode === 'live') {
      empresa.modo_live = value;
    } else {
      empresa.modo_autonomo = value;
    }

    await empresa.save();
    return empresa;
  }

  /**
   * Get all ideas, branches, and actions for a company
   */
  static async getCompanyData(userId: string): Promise<{
    empresa: IEmpresa;
    branches: IRama[];
    ideas: IIdea[];
    actions: IAccion[];
  } | null> {
    const Empresa = mongoose.models.Empresa;
    const Rama = mongoose.models.Rama;
    const Idea = mongoose.models.Idea;
    const Accion = mongoose.models.Accion;

    const empresa = await Empresa.findOne({ usuario_id: userId }) as IEmpresa | null;
    if (!empresa) {
      return null;
    }

    const branches = await Rama.find({ empresa_id: empresa._id }) as IRama[];
    const branchIds = branches.map(b => b._id);
    const ideas = await Idea.find({ rama_id: { $in: branchIds } }) as IIdea[];
    const actions = await Accion.find({ empresa_id: empresa._id }) as IAccion[];

    return {
      empresa,
      branches,
      ideas,
      actions
    };
  }

  /**
   * Compile a beautiful B2B daily executive report
   */
  static async generateDailyReport(userId: string): Promise<{
    companyName: string;
    budget: { total: number; spent: number; available: number; pctUsed: number };
    competingBattle: any;
    top3Ideas: IIdea[];
    implementedIdeasCount: number;
    recommendedIdea?: IIdea;
    pendingActions: IAccion[];
    reportMessage: string;
  }> {
    const data = await this.getCompanyData(userId);
    if (!data) {
      throw new Error('Empresa no encontrada.');
    }

    const { empresa, ideas, actions } = data;

    // Sort ideas by score descending to find the top 3
    const top3 = [...ideas].sort((a, b) => b.puntuacion - a.puntuacion).slice(0, 3);
    const bestIdea = top3[0];

    const pendingActions = actions.filter(a => a.estado === 'pendiente');

    // Run a quick simulation of the latest squad battle
    const battleResult = await this.runCompetitiveSquadBattle(userId);

    const pctUsed = Number(((empresa.presupuesto_gastado / (empresa.presupuesto_total || 1)) * 100).toFixed(1));

    // Construct Report Message
    let reportMessage = `📊 *REPORTE CORPORATIVO DIARIO - CONGLOMERADO AI*\n\n`;
    reportMessage += `🏢 Empresa: *${empresa.nombre}*\n`;
    reportMessage += `📈 Estado del Presupuesto:\n`;
    reportMessage += `   • Total: $${empresa.presupuesto_total.toLocaleString()}\n`;
    reportMessage += `   • Gastado: $${empresa.presupuesto_gastado.toLocaleString()} (${pctUsed}%)\n`;
    reportMessage += `   • Disponible: $${empresa.presupuesto_disponible.toLocaleString()}\n\n`;

    reportMessage += `⚔️ *DISPUTA DE SQUADS AI (Carrera Creativa):*\n`;
    reportMessage += `   • Squad Alfa (Equipo 1): ${empresa.equipo_1_score} pts (Avg Score: ${battleResult.alphaAvgScore})\n`;
    reportMessage += `   • Squad Beta (Equipo 2): ${empresa.equipo_2_score} pts (Avg Score: ${battleResult.betaAvgScore})\n`;
    reportMessage += `   🏆 Ganador de la Jornada: *${battleResult.winner === 'equipo_1' ? 'Squad Alfa' : battleResult.winner === 'equipo_2' ? 'Squad Beta' : 'Empate'}*\n`;
    reportMessage += `   📝 ${battleResult.supervisorReview}\n\n`;

    reportMessage += `💡 *TOP 3 PROPUESTAS DE VALOR (Jornada de Hoy):*\n`;
    top3.forEach((id, index) => {
      reportMessage += `   ${index + 1}. *${id.nombre}* - ROI: ${id.roi}x | Costo: $${id.costo} | Punt: ${id.puntuacion}/10\n`;
    });
    reportMessage += `\n`;

    if (bestIdea) {
      reportMessage += `🎯 *RECOMENDACIÓN DEL SUPERVISOR CEO:*\n`;
      reportMessage += `   Te recomendamos implementar: *${bestIdea.nombre}*.\n`;
      reportMessage += `   _Justificación: Ofrece el mejor retorno de inversión proyectado (${bestIdea.roi}x) con un riesgo de nivel ${bestIdea.riesgo}._\n\n`;
    }

    reportMessage += `✅ Ideas Implementadas en Operación: ${empresa.ideas_implementadas.length}\n`;
    reportMessage += `⚙️ Acciones Reales Pendientes en Cola: ${pendingActions.length}\n`;
    reportMessage += `🌐 Modos del Sistema: LIVE [${empresa.modo_live ? 'ACTIVADO 🟢' : 'DESACTIVADO 🔴'}] | AUTÓNOMO [${empresa.modo_autonomo ? 'ACTIVADO 🟢' : 'DESACTIVADO 🔴'}]`;

    // Save report date
    empresa.last_report_date = new Date();
    await empresa.save();

    return {
      companyName: empresa.nombre,
      budget: {
        total: empresa.presupuesto_total,
        spent: empresa.presupuesto_gastado,
        available: empresa.presupuesto_disponible,
        pctUsed
      },
      competingBattle: battleResult,
      top3Ideas: top3,
      implementedIdeasCount: empresa.ideas_implementadas.length,
      recommendedIdea: bestIdea,
      pendingActions,
      reportMessage
    };
  }
}
