
import { GoogleGenAI } from "@google/genai";
import { Product, Invoice } from "../types";
import { logger } from "./logger";

export interface FinancialReportSummary {
  dateRangeLabel: string;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  invoiceCount: number;
  expenseCount: number;
  topProducts: { name: string; qty: number }[];
  expenseCategories: { name: string; value: number }[];
}

export interface GoalProgressSummary {
  monthLabel: string;
  target: number;
  accumulated: number;
  progress: number;
  remaining: number;
  remainingDays: number;
  neededPerDay: number;
  avgPerDay: number;
  monthExpenses: number;
}

export const GeminiService = {
  /**
   * Generate a creative product description based on name and category.
   */
  generateProductDescription: async (name: string, category: string): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Escribe una descripción corta, atractiva y profesional para un producto llamado "${name}" que pertenece a la categoría "${category}". Máximo 2 frases. En español.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      return response.text?.trim() || "No se pudo generar la descripción.";
    } catch (error) {
      logger.error('GeminiService.generateProductDescription', error);
      return "Error al conectar con el asistente de IA.";
    }
  },

  /**
   * Analyze sales data and provide business insights.
   */
  analyzeBusinessData: async (invoices: Invoice[], products: Product[]): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const totalSales = invoices.reduce((acc, inv) => acc + inv.total, 0);
      const salesCount = invoices.length;
      const lowStockProducts = products.filter(p => p.stock < 5).map(p => p.name);
      
      const dataSummary = `
        Total Ventas: ${totalSales}
        Cantidad Facturas: ${salesCount}
        Productos con bajo stock: ${lowStockProducts.join(', ')}
      `;

      const prompt = `
        Actúa como un consultor de negocios experto. Analiza los siguientes datos resumidos de una pequeña empresa:
        ${dataSummary}
        
        Proporciona 3 consejos breves y estratégicos para mejorar el negocio, enfocándote en ventas e inventario.
        Formato: Lista con viñetas. En español.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "No se pudo generar el análisis.";
    } catch (error) {
      logger.error('GeminiService.analyzeBusinessData', error);
      return "Error al analizar los datos.";
    }
  },

  /**
   * Analyze the currently visible financial report (Reports.tsx).
   * Consumes already-computed totals — no recalculation here.
   */
  analyzeFinancialReport: async (summary: FinancialReportSummary): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const dataSummary = `
        Rango: ${summary.dateRangeLabel}
        Ventas totales: ${summary.totalSales} (${summary.invoiceCount} facturas)
        Gastos totales: ${summary.totalExpenses} (${summary.expenseCount} movimientos)
        Utilidad neta: ${summary.netProfit} (margen ${summary.profitMargin.toFixed(1)}%)
        Productos más vendidos: ${summary.topProducts.map(p => `${p.name} (${p.qty} uds)`).join(', ') || 'sin datos'}
        Gastos por categoría: ${summary.expenseCategories.map(c => `${c.name}: ${c.value}`).join(', ') || 'sin datos'}
      `;

      const prompt = `
        Actúa como un consultor financiero experto para una pequeña empresa en Costa Rica.
        Analiza este reporte financiero del período "${summary.dateRangeLabel}":
        ${dataSummary}

        Proporciona: 1) un diagnóstico breve de la salud financiera, 2) 3 recomendaciones accionables
        para mejorar el margen o reducir gastos. Formato: lista con viñetas. En español. Sé conciso.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "No se pudo generar el análisis.";
    } catch (error) {
      logger.error('GeminiService.analyzeFinancialReport', error);
      return "Error al analizar el reporte. Verifique su conexión e intente de nuevo.";
    }
  },

  /**
   * Analyze monthly sales-goal progress (Goals.tsx).
   * Consumes already-computed progress — no recalculation here.
   */
  analyzeGoalProgress: async (summary: GoalProgressSummary): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const dataSummary = `
        Mes: ${summary.monthLabel}
        Meta mensual: ${summary.target}
        Acumulado: ${summary.accumulated} (${summary.progress.toFixed(1)}%)
        Faltante: ${summary.remaining} en ${summary.remainingDays} día(s) restante(s)
        Monto necesario por día: ${summary.neededPerDay.toFixed(0)}
        Promedio diario logrado: ${summary.avgPerDay.toFixed(0)}
        Gastos del mes: ${summary.monthExpenses}
      `;

      const prompt = `
        Actúa como un coach de ventas para una pequeña empresa. Analiza este avance de meta mensual:
        ${dataSummary}

        Proporciona: 1) una lectura motivadora del avance (1-2 frases), 2) 3 acciones concretas
        para alcanzar o superar la meta antes de fin de mes. Formato: lista con viñetas. En español. Sé conciso.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "No se pudo generar el análisis.";
    } catch (error) {
      logger.error('GeminiService.analyzeGoalProgress', error);
      return "Error al analizar la meta. Verifique su conexión e intente de nuevo.";
    }
  },

  /**
   * Analyze inventory health: what to restock, overstock and opportunities.
   */
  analyzeInventory: async (products: Product[]): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const lowStock = products.filter(p => p.stock < 5).map(p => `${p.name} (${p.stock} uds)`);
      const outOfStock = products.filter(p => p.stock <= 0).map(p => p.name);
      const overStock = products.filter(p => p.stock > 50).map(p => `${p.name} (${p.stock} uds)`);
      const withCost = products.filter(p => (p.cost || 0) > 0);
      const avgMargin = withCost.length > 0
        ? withCost.reduce((acc, p) => acc + ((p.price - (p.cost || 0)) / (p.price || 1)) * 100, 0) / withCost.length
        : 0;

      const dataSummary = `
        Total productos: ${products.length}
        Sin stock: ${outOfStock.join(', ') || 'ninguno'}
        Stock bajo (<5): ${lowStock.join(', ') || 'ninguno'}
        Posible sobrestock (>50): ${overStock.join(', ') || 'ninguno'}
        Margen promedio: ${avgMargin.toFixed(1)}%
      `;

      const prompt = `
        Actúa como un experto en gestión de inventarios para una pequeña empresa. Analiza este estado del inventario:
        ${dataSummary}

        Proporciona: 1) qué reponer con urgencia, 2) qué hacer con el posible sobrestock,
        3) 1 consejo de margen o surtido. Formato: lista con viñetas. En español. Sé conciso.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "No se pudo generar el análisis.";
    } catch (error) {
      logger.error('GeminiService.analyzeInventory', error);
      return "Error al analizar el inventario. Verifique su conexión e intente de nuevo.";
    }
  }
};
