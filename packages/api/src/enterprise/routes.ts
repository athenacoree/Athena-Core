import { Router, Request, Response } from 'express';
import { EnterpriseAIService } from './controller';
import { logger } from '@librechat/data-schemas';

const router: Router = Router();

// Middleware to ensure user is authenticated (req.user is set by JWT auth middleware)
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'No autorizado. Se requiere token JWT.' });
  }
  next();
};

router.use(requireAuth);

/**
 * @route POST /api/enterprise/register
 * @desc Register or update the user's company and initial budget
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, presupuesto } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la empresa es obligatorio.' });
    }
    const budget = presupuesto ? parseFloat(presupuesto) : 0;
    const empresa = await EnterpriseAIService.registerCompany(req.user.id, nombre, descripcion, budget);
    return res.status(200).json(empresa);
  } catch (error: any) {
    logger.error('[enterprise] Error registering company', error);
    return res.status(500).json({ error: error.message || 'Error registrando la empresa.' });
  }
});

/**
 * @route GET /api/enterprise/status
 * @desc Get the complete state of the enterprise including branches, ideas, and actions
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const data = await EnterpriseAIService.getCompanyData(req.user.id);
    if (!data) {
      return res.status(404).json({ error: 'Empresa no encontrada para el usuario.' });
    }
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error('[enterprise] Error getting company status', error);
    return res.status(500).json({ error: error.message || 'Error obteniendo estado de la empresa.' });
  }
});

/**
 * @route POST /api/enterprise/budget
 * @desc Update the total budget
 */
router.post('/budget', async (req: Request, res: Response) => {
  try {
    const { presupuesto } = req.body;
    if (presupuesto === undefined || isNaN(parseFloat(presupuesto))) {
      return res.status(400).json({ error: 'El presupuesto debe ser un número válido.' });
    }
    const empresa = await EnterpriseAIService.updateBudget(req.user.id, parseFloat(presupuesto));
    return res.status(200).json(empresa);
  } catch (error: any) {
    logger.error('[enterprise] Error updating budget', error);
    return res.status(500).json({ error: error.message || 'Error actualizando presupuesto.' });
  }
});

/**
 * @route POST /api/enterprise/branches
 * @desc Generate 3 branches and 3 competing ideas per branch (9 ideas total)
 */
router.post('/branches', async (req: Request, res: Response) => {
  try {
    const data = await EnterpriseAIService.getCompanyData(req.user.id);
    if (!data || !data.empresa) {
      return res.status(404).json({ error: 'Primero debes crear tu empresa.' });
    }

    // Generate Branches
    const branches = await EnterpriseAIService.generateBranches(data.empresa._id.toString());
    // Generate Ideas per Branch
    const ideas = await EnterpriseAIService.generateIdeas(branches);

    return res.status(200).json({
      message: 'Ramas e ideas corporativas generadas con éxito por el equipo de Estrategia y Creativos Compitiendo.',
      branches,
      ideas
    });
  } catch (error: any) {
    logger.error('[enterprise] Error generating branches and ideas', error);
    return res.status(500).json({ error: error.message || 'Error al generar ramas e ideas.' });
  }
});

/**
 * @route POST /api/enterprise/custom-ideas
 * @desc Generate 3 custom ideas on a specific topic
 */
router.post('/custom-ideas', async (req: Request, res: Response) => {
  try {
    const { tema } = req.body;
    if (!tema) {
      return res.status(400).json({ error: 'El tema específico es obligatorio.' });
    }
    const ideas = await EnterpriseAIService.generateIdeasOnTopic(req.user.id, tema);
    return res.status(200).json({
      message: `Ideas personalizadas para "${tema}" generadas con éxito por los equipos competidores.`,
      ideas
    });
  } catch (error: any) {
    logger.error('[enterprise] Error generating topic ideas', error);
    return res.status(500).json({ error: error.message || 'Error al generar ideas personalizadas.' });
  }
});

/**
 * @route POST /api/enterprise/battle
 * @desc Trigger a competitive battle simulation between Team 1 and Team 2
 */
router.post('/battle', async (req: Request, res: Response) => {
  try {
    const battle = await EnterpriseAIService.runCompetitiveSquadBattle(req.user.id);
    return res.status(200).json(battle);
  } catch (error: any) {
    logger.error('[enterprise] Error triggering competitive battle', error);
    return res.status(500).json({ error: error.message || 'Error al disputar la batalla de squads.' });
  }
});

/**
 * @route POST /api/enterprise/implement
 * @desc Implement an idea, deducting cost from available budget
 */
router.post('/implement', async (req: Request, res: Response) => {
  try {
    const { ideaId } = req.body;
    if (!ideaId) {
      return res.status(400).json({ error: 'El ID de la idea a implementar es obligatorio.' });
    }
    const result = await EnterpriseAIService.implementIdea(req.user.id, ideaId);
    return res.status(200).json({
      message: 'Idea implementada con éxito e integrada en las operaciones de la empresa.',
      ...result
    });
  } catch (error: any) {
    logger.error('[enterprise] Error implementing idea', error);
    return res.status(500).json({ error: error.message || 'Error al implementar idea.' });
  }
});

/**
 * @route POST /api/enterprise/action
 * @desc Enqueue/execute a real-world B2B action
 */
router.post('/action', async (req: Request, res: Response) => {
  try {
    const { tipo, descripcion, costo } = req.body;
    if (!tipo || !descripcion || costo === undefined) {
      return res.status(400).json({ error: 'Tipo, descripción y costo son obligatorios.' });
    }
    const action = await EnterpriseAIService.createAction(req.user.id, tipo, descripcion, parseFloat(costo));
    return res.status(200).json({
      message: 'Acción corporativa registrada en la cola real de operaciones.',
      action
    });
  } catch (error: any) {
    logger.error('[enterprise] Error creating action', error);
    return res.status(500).json({ error: error.message || 'Error al registrar acción.' });
  }
});

/**
 * @route POST /api/enterprise/mode
 * @desc Toggle LIVE or AUTONOMOUS modes
 */
router.post('/mode', async (req: Request, res: Response) => {
  try {
    const { modo, activar } = req.body;
    if (modo !== 'live' && modo !== 'autonomo') {
      return res.status(400).json({ error: 'Modo inválido. Debe ser "live" o "autonomo".' });
    }
    if (activar === undefined) {
      return res.status(400).json({ error: 'El valor de "activar" (true/false) es obligatorio.' });
    }
    const empresa = await EnterpriseAIService.toggleModes(req.user.id, modo, activar === true);
    return res.status(200).json({
      message: `Modo ${modo.toUpperCase()} actualizado con éxito.`,
      empresa
    });
  } catch (error: any) {
    logger.error('[enterprise] Error toggling system mode', error);
    return res.status(500).json({ error: error.message || 'Error actualizando modo del sistema.' });
  }
});

/**
 * @route GET /api/enterprise/report
 * @desc Compile daily executive B2B report
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    const report = await EnterpriseAIService.generateDailyReport(req.user.id);
    return res.status(200).json(report);
  } catch (error: any) {
    logger.error('[enterprise] Error compiling report', error);
    return res.status(500).json({ error: error.message || 'Error al generar reporte corporativo.' });
  }
});

export default router;
