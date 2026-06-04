/**
 * bcgService.js
 * Lógica matemática de negocio para el procesamiento de la Matriz BCG.
 * ContaPerú S.A.C.
 */

const BCGService = {
  /**
   * Calcula la Tasa de Crecimiento del Mercado (TCM) - Eje Y
   * @param {number} ventasActual 
   * @param {number} ventasAnterior 
   * @returns {number} Porcentaje de crecimiento
   */
  calcularTCM(ventasActual, ventasAnterior) {
    if (!ventasAnterior || ventasAnterior <= 0) return 0;
    return parseFloat((((ventasActual - ventasAnterior) / ventasAnterior) * 100).toFixed(2));
  },

  /**
   * Calcula la Participación Relativa en el Mercado (PRM) - Eje X
   * @param {number} ventasEmpresa 
   * @param {number} ventasCompetidorLider 
   * @returns {number} Cuota relativa
   */
  calcularPRM(ventasEmpresa, ventasCompetidorLider) {
    if (!ventasCompetidorLider || ventasCompetidorLider <= 0) return 0;
    return parseFloat((ventasEmpresa / ventasCompetidorLider).toFixed(2));
  },

  /**
   * Determina el cuadrante correspondiente según las coordenadas TCM y PRM
   * Umbral de corte: TCM = 10%, PRM = 1.0
   * @param {number} tcm 
   * @param {number} prm 
   * @returns {string} 'Estrella' | 'Incógnita' | 'Vaca' | 'Perro'
   */
  obtenerCuadrante(tcm, prm) {
    const umbralTCM = 10.0;
    const umbralPRM = 1.0;

    if (tcm >= umbralTCM) {
      return prm >= umbralPRM ? 'Estrella' : 'Incógnita';
    } else {
      return prm >= umbralPRM ? 'Vaca' : 'Perro';
    }
  },

  /**
   * Obtiene la recomendación estratégica de la UEN según su cuadrante
   * @param {string} cuadrante 
   * @returns {Object} { estrategia, inversion, rentabilidad, decision }
   */
  obtenerRecomendacion(cuadrante) {
    const recomendacion = {
      cuadrante: cuadrante,
      estrategia: '',
      inversion: '',
      rentabilidad: '',
      decision: ''
    };

    switch (cuadrante) {
      case 'Vaca':
        recomendacion.estrategia = 'Mantenerse';
        recomendacion.inversion = 'Baja';
        recomendacion.rentabilidad = 'Alta';
        recomendacion.decision = 'MANTENER';
        break;
      case 'Estrella':
        recomendacion.estrategia = 'Crecer o mantenerse';
        recomendacion.inversion = 'Alta';
        recomendacion.rentabilidad = 'Alta';
        recomendacion.decision = 'POTENCIAR';
        break;
      case 'Incógnita':
        recomendacion.estrategia = 'Crecer / Invertir';
        recomendacion.inversion = 'Muy Alta';
        recomendacion.rentabilidad = 'Baja o Negativa';
        recomendacion.decision = 'EVALUAR';
        break;
      case 'Perro':
        recomendacion.estrategia = 'Cosechar o desinvestir';
        recomendacion.inversion = 'Baja / Desinvestir';
        recomendacion.rentabilidad = 'Muy Baja o Negativa';
        recomendacion.decision = 'REESTRUCTURAR O DESINVERTIR';
        break;
      default:
        recomendacion.estrategia = '—';
        recomendacion.inversion = '—';
        recomendacion.rentabilidad = '—';
        recomendacion.decision = '—';
    }

    return recomendacion;
  },

  /**
   * Procesa un listado de UENs con sus datos financieros brutos
   * @param {Array} uens Lista de objetos UEN con ventas, mercado anterior, mercado actual, competidor lider ventas
   * @returns {Array} UENs con coordenadas y cuadrantes calculados
   */
  procesarMatriz(uens) {
    const totalVentasEmpresa = uens.reduce((sum, uen) => sum + (parseFloat(uen.ventas_empresa) || 0), 0);

    return uens.map(uen => {
      const ventasEmpresa = parseFloat(uen.ventas_empresa) || 0;
      const ventasMercadoAnterior = parseFloat(uen.ventas_mercado_anterior) || 0;
      const ventasMercadoActual = parseFloat(uen.ventas_mercado_actual) || 0;
      const ventasCompetidor = parseFloat(uen.ventas_competidor_lider) || 0;

      // Calcular peso porcentual
      const pesoPorcentual = totalVentasEmpresa > 0 ? parseFloat(((ventasEmpresa / totalVentasEmpresa) * 100).toFixed(2)) : 0;

      // Calcular TCM y PRM
      const tcm = this.calcularTCM(ventasMercadoActual, ventasMercadoAnterior);
      const prm = this.calcularPRM(ventasEmpresa, ventasCompetidor);

      // Determinar Cuadrante y Recomendaciones
      const cuadrante = this.obtenerCuadrante(tcm, prm);
      const rec = this.obtenerRecomendacion(cuadrante);

      return {
        ...uen,
        peso_porcentual: pesoPorcentual,
        tcm: tcm,
        prm: prm,
        cuadrante: cuadrante,
        estrategia: rec.estrategia,
        inversion: rec.inversion,
        rentabilidad: rec.rentabilidad,
        decision: rec.decision
      };
    });
  }
};

// Hacer disponible globalmente
window.BCGService = BCGService;
