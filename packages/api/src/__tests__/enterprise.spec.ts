import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '@librechat/data-schemas';
import { EnterpriseAIService } from '../enterprise/controller';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Initialize all Mongoose models including our corporate enterprise ones
  createModels(mongoose);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Enterprise B2B AI Service - Integration Tests', () => {
  const mockUserId = 'user_corp_test_123';
  const companyName = 'Global AI Corp';
  const companyDesc = 'B2B Workflow Automation Solutions';
  const initialBudget = 50000;

  beforeEach(async () => {
    // Clear collections before each test to guarantee isolated states
    if (mongoose.models.Empresa) await mongoose.models.Empresa.deleteMany({});
    if (mongoose.models.Rama) await mongoose.models.Rama.deleteMany({});
    if (mongoose.models.Idea) await mongoose.models.Idea.deleteMany({});
    if (mongoose.models.Accion) await mongoose.models.Accion.deleteMany({});
  });

  test('should register a company and initialize the budget correctly', async () => {
    const empresa = await EnterpriseAIService.registerCompany(mockUserId, companyName, companyDesc, initialBudget);

    expect(empresa).toBeDefined();
    expect(empresa.nombre).toBe(companyName);
    expect(empresa.descripcion).toBe(companyDesc);
    expect(empresa.presupuesto_total).toBe(initialBudget);
    expect(empresa.presupuesto_disponible).toBe(initialBudget);
    expect(empresa.presupuesto_gastado).toBe(0);
    expect(empresa.modo_live).toBe(false);
    expect(empresa.modo_autonomo).toBe(false);
  });

  test('should enforce budget constraint policies on action creation', async () => {
    // Register company with limited budget
    const budget = 5000;
    await EnterpriseAIService.registerCompany(mockUserId, companyName, companyDesc, budget);

    // Create an action within budget limits
    const action1 = await EnterpriseAIService.createAction(mockUserId, 'ads', 'Facebook Ad campaign', 2000);
    expect(action1).toBeDefined();
    expect(action1.costo).toBe(2000);
    expect(action1.estado).toBe('pendiente');

    // Get company state to verify budget reduction
    const data = await EnterpriseAIService.getCompany(mockUserId);
    expect(data!.presupuesto_gastado).toBe(2000);
    expect(data!.presupuesto_disponible).toBe(3000);

    // Attempt to exceed budget limit
    await expect(
      EnterpriseAIService.createAction(mockUserId, 'consulting', 'Premium consultation', 4000)
    ).rejects.toThrow('Acción rechazada. El costo ($4000) supera el presupuesto disponible ($3000)');
  });

  test('should generate corporate branches and competing team ideas (Squad Alfa vs Squad Beta)', async () => {
    const empresa = await EnterpriseAIService.registerCompany(mockUserId, companyName, companyDesc, initialBudget);

    // Generate 3 growth branches
    const branches = await EnterpriseAIService.generateBranches(empresa._id.toString());
    expect(branches).toHaveLength(3);
    expect(branches[0].nombre).toBeDefined();

    // Generate 3 competitive ideas per branch (9 ideas total)
    const ideas = await EnterpriseAIService.generateIdeas(branches);
    expect(ideas).toHaveLength(9);

    // Verify ideas alternate and have correct structure
    const idea1 = ideas[0];
    expect(idea1.nombre).toBeDefined();
    expect(idea1.costo).toBeGreaterThan(0);
    expect(idea1.roi).toBeGreaterThan(0);
    expect(idea1.puntuacion).toBeGreaterThanOrEqual(1.0);
    expect(idea1.puntuacion).toBeLessThanOrEqual(10.0);
    expect(idea1.implementada).toBe(false);
    expect(['equipo_1', 'equipo_2']).toContain(idea1.equipo);

    // Count squad assignments to make sure there is competition
    const team1Count = ideas.filter(i => i.equipo === 'equipo_1').length;
    const team2Count = ideas.filter(i => i.equipo === 'equipo_2').length;
    expect(team1Count).toBeGreaterThan(0);
    expect(team2Count).toBeGreaterThan(0);
  });

  test('should execute competitive battle simulation and award scores', async () => {
    const empresa = await EnterpriseAIService.registerCompany(mockUserId, companyName, companyDesc, initialBudget);
    const branches = await EnterpriseAIService.generateBranches(empresa._id.toString());
    await EnterpriseAIService.generateIdeas(branches);

    // Execute battle
    const battle = await EnterpriseAIService.runCompetitiveSquadBattle(mockUserId);
    expect(battle).toBeDefined();
    expect(['equipo_1', 'equipo_2', 'empate']).toContain(battle.winner);
    expect(battle.alphaAvgScore).toBeGreaterThan(0);
    expect(battle.betaAvgScore).toBeGreaterThan(0);
    expect(battle.supervisorReview).toContain('Supervisor:');

    // Retrieve updated company to confirm score accumulation
    const updated = await EnterpriseAIService.getCompany(mockUserId);
    expect(updated!.equipo_1_score + updated!.equipo_2_score).toBeGreaterThan(0);
    expect(updated!.supervisor_score).toBeGreaterThan(0);
    expect(updated!.tesorero_score).toBeGreaterThan(0);
  });

  test('should generate custom ideas based on user topic choice', async () => {
    await EnterpriseAIService.registerCompany(mockUserId, companyName, companyDesc, initialBudget);

    const customIdeas = await EnterpriseAIService.generateIdeasOnTopic(mockUserId, 'Café Orgánico Express');
    expect(customIdeas).toHaveLength(3);
    expect(customIdeas[0].nombre).toContain('Café Orgánico Express');
    expect(customIdeas[0].descripcion).toBeDefined();
    expect(customIdeas[0].costo).toBeGreaterThan(0);
  });

  test('should allow implementation of an idea and deduct from budget correctly', async () => {
    const empresa = await EnterpriseAIService.registerCompany(mockUserId, companyName, companyDesc, 10000);
    const branches = await EnterpriseAIService.generateBranches(empresa._id.toString());
    const ideas = await EnterpriseAIService.generateIdeas(branches);

    const targetIdea = ideas[0];
    const ideaCost = targetIdea.costo;

    const result = await EnterpriseAIService.implementIdea(mockUserId, targetIdea._id.toString());
    expect(result.idea.implementada).toBe(true);
    expect(result.empresa.presupuesto_gastado).toBe(ideaCost);
    expect(result.empresa.presupuesto_disponible).toBe(10000 - ideaCost);
    expect(result.empresa.ideas_implementadas).toContain(targetIdea.nombre);
  });

  test('should toggle modes (LIVE/AUTONOMOUS) and maintain state', async () => {
    await EnterpriseAIService.registerCompany(mockUserId, companyName, companyDesc, initialBudget);

    // Toggle live mode ON
    const updated1 = await EnterpriseAIService.toggleModes(mockUserId, 'live', true);
    expect(updated1.modo_live).toBe(true);

    // Toggle autonomous ON
    const updated2 = await EnterpriseAIService.toggleModes(mockUserId, 'autonomo', true);
    expect(updated2.modo_autonomo).toBe(true);

    // Toggle live mode OFF
    const updated3 = await EnterpriseAIService.toggleModes(mockUserId, 'live', false);
    expect(updated3.modo_live).toBe(false);
    expect(updated3.modo_autonomo).toBe(true);
  });

  test('should generate a beautiful corporate daily executive report', async () => {
    const empresa = await EnterpriseAIService.registerCompany(mockUserId, companyName, companyDesc, initialBudget);
    const branches = await EnterpriseAIService.generateBranches(empresa._id.toString());
    await EnterpriseAIService.generateIdeas(branches);

    const report = await EnterpriseAIService.generateDailyReport(mockUserId);
    expect(report).toBeDefined();
    expect(report.companyName).toBe(companyName);
    expect(report.budget.total).toBe(initialBudget);
    expect(report.top3Ideas).toHaveLength(3);
    expect(report.reportMessage).toContain('REPORTE CORPORATIVO DIARIO');
    expect(report.reportMessage).toContain('Global AI Corp');
    expect(report.reportMessage).toContain('DISPUTA DE SQUADS AI');
    expect(report.reportMessage).toContain('TOP 3 PROPUESTAS DE VALOR');
  });
});
