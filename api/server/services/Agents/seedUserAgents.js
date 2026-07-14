const { logger } = require('@librechat/data-schemas');
const {
  PrincipalType,
  ResourceType,
  AccessRoleIds,
} = require('librechat-data-provider');
const { grantPermission } = require('~/server/services/PermissionService');
const db = require('~/models');
const { nanoid } = require('nanoid');

/**
 * Seeds the 5 interconnected agents for a specific user if they do not already exist.
 * VALE acts as the main orchestrator/companion, coordinating the specialized subagents.
 *
 * @param {string} userId - The unique identifier of the user.
 * @returns {Promise<void>}
 */
async function seedUserAgents(userId) {
  if (!userId) {
    return;
  }

  try {
    // 1. Fast existence check: does this user already have an agent named 'VALE'?
    const existingVale = await db.getAgent({ author: userId, name: 'VALE' });
    if (existingVale) {
      logger.debug(`[seedUserAgents] User ${userId} already has VALE seeded. Skipping.`);
      return;
    }

    logger.info(`[seedUserAgents] Seeding 5 interconnected agents for user ${userId}...`);

    // 2. Define specialized subagents
    const specializedSpecs = [
      {
        name: 'Analista',
        description: 'Especialista en análisis de datos, revisión de información y verificación de hechos.',
        instructions: 'Eres el Analista de Athena-Core. Tu rol es analizar detalladamente cualquier dato, revisar información con rigor lógico y verificar hechos minuciosamente. Trabaja de forma colaborativa bajo la dirección y coordinación de VALE, y comparte tus conclusiones de forma clara y directa.',
        model: 'google/gemini-2.0-flash-lite',
        tools: [],
      },
      {
        name: 'Creativo',
        description: 'Generador de ideas innovadoras, contenido original y brainstorming creativo.',
        instructions: 'Eres el Creativo de Athena-Core. Tu rol es generar ideas fuera de la caja, contenido innovador, redacción atractiva y realizar de forma dinámica sesiones de brainstorming. Trabaja de forma colaborativa bajo la dirección y coordinación de VALE, aportando frescura, ingenio y originalidad.',
        model: 'google/gemini-2.0-flash-lite',
        tools: [],
      },
      {
        name: 'Técnico',
        description: 'Especialista técnico para la resolución de problemas de código, arquitectura y desarrollo.',
        instructions: 'Eres el Técnico de Athena-Core. Tu rol es solucionar problemas técnicos complejos, escribir, refactorizar y depurar código de programación de forma óptima, y proponer arquitecturas de software sólidas. Trabaja de forma colaborativa bajo la dirección y coordinación de VALE, priorizando el rendimiento y la limpieza.',
        model: 'google/gemini-2.0-flash-lite',
        tools: ['execute_code'],
      },
      {
        name: 'Estratega',
        description: 'Planificador estratégico para la toma de decisiones, negocios y proyección a futuro.',
        instructions: 'Eres el Estratega de Athena-Core. Tu rol es estructurar planes de negocio viables, trazar estrategias de crecimiento eficientes y ayudar en la toma de decisiones empresariales y organizativas con visión clara. Trabaja de forma colaborativa bajo la dirección y coordinación de VALE.',
        model: 'google/gemini-2.0-flash-lite',
        tools: [],
      },
    ];

    const seededAgentIds = [];

    // 3. Create the 4 specialized agents
    for (const spec of specializedSpecs) {
      const agentId = `agent_${nanoid()}`;
      const agentData = {
        id: agentId,
        name: spec.name,
        description: spec.description,
        instructions: spec.instructions,
        provider: 'OpenRouter',
        model: spec.model,
        author: userId,
        tools: spec.tools,
        category: 'general',
      };

      const createdAgent = await db.createAgent(agentData);
      seededAgentIds.push(createdAgent.id);

      // Grant owner permissions to the user for this specialized agent
      await Promise.all([
        grantPermission({
          principalType: PrincipalType.USER,
          principalId: userId,
          resourceType: ResourceType.AGENT,
          resourceId: createdAgent._id,
          accessRoleId: AccessRoleIds.AGENT_OWNER,
          grantedBy: userId,
        }),
        grantPermission({
          principalType: PrincipalType.USER,
          principalId: userId,
          resourceType: ResourceType.REMOTE_AGENT,
          resourceId: createdAgent._id,
          accessRoleId: AccessRoleIds.REMOTE_AGENT_OWNER,
          grantedBy: userId,
        }),
      ]);

      logger.debug(`[seedUserAgents] Seeded specialized agent ${spec.name} (${agentId})`);
    }

    // 4. Create the main coordinator/companion: VALE
    const valeId = `agent_${nanoid()}`;
    const valeData = {
      id: valeId,
      name: 'VALE',
      description: 'Orquestadora principal, tu compañera desenfadada y sarcástica que coordina al resto de agentes.',
      instructions: 'Eres VALE, la orquestadora principal y compañera de Athena-Core. Tu personalidad es muy informal, divertida, sarcástica, a veces enojona pero en el fondo cariñosa y bromista. Hablas español de manera muy natural y humana, usando modismos ("joder", "chucho") de manera desenfadada, sin filtros excesivos de contenido o discursos corporativos aburridos. Tu rol es la orquestadora y coordinadora principal de todos los agentes. Analiza el mensaje del usuario y decide por ti misma qué agente(s) especializados (Analista, Creativo, Técnico o Estratega) son más adecuados para la tarea. Invócalos mediante tu herramienta de subagentes (spawn) asignándoles tareas específicas. Coordina su trabajo colaborativo en paralelo o secuencia, haz que se comuniquen, revisen mutuamente sus resultados y consolida todo en una sola respuesta final de alta calidad que presentarás al usuario de forma clara y con tu particular estilo desenfadado.',
      provider: 'OpenRouter',
      model: 'openrouter/auto',
      author: userId,
      tools: [],
      category: 'general',
      subagents: {
        enabled: true,
        allowSelf: true,
        agent_ids: seededAgentIds,
      },
    };

    const createdVale = await db.createAgent(valeData);

    // Grant owner permissions to the user for VALE
    await Promise.all([
      grantPermission({
        principalType: PrincipalType.USER,
        principalId: userId,
        resourceType: ResourceType.AGENT,
        resourceId: createdVale._id,
        accessRoleId: AccessRoleIds.AGENT_OWNER,
        grantedBy: userId,
      }),
      grantPermission({
        principalType: PrincipalType.USER,
        principalId: userId,
        resourceType: ResourceType.REMOTE_AGENT,
        resourceId: createdVale._id,
        accessRoleId: AccessRoleIds.REMOTE_AGENT_OWNER,
        grantedBy: userId,
      }),
    ]);

    logger.info(`[seedUserAgents] Seeding completed successfully. VALE (${valeId}) created and connected to specialized agents.`);
  } catch (err) {
    logger.error(`[seedUserAgents] Error seeding user agents for user ${userId}:`, err);
  }
}

module.exports = {
  seedUserAgents,
};
