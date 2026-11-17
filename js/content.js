// Contenido del juego, tomado del informe del Grupo 2 sobre ISO/IEC 38500:2024.
// Cada ficha tiene una o más ramas válidas: la primera es su lugar "oficial" en el mapa.

export const BRANCHES = [
  { id: "def", name: "¿Qué es?", hint: "definición y origen", color: "#ff5d8f", tint: "#ffe4ee" },
  { id: "res", name: "Resultados", hint: "lo que busca lograr", color: "#ffd23f", tint: "#fff3bf" },
  { id: "mod", name: "Modelo", hint: "lo que hace el consejo", color: "#36e2d0", tint: "#d5f9f4" },
  { id: "pri", name: "Principios", hint: "las reglas que orientan", color: "#a78bfa", tint: "#ede9fe" },
  { id: "mar", name: "Marco", hint: "gobierno + gestión juntos", color: "#ff9f1c", tint: "#ffedd5" },
  { id: "fam", name: "Familia e IA", hint: "normas que la acompañan", color: "#4ade80", tint: "#dcfce7" },
];

export const TILES = [
  // ¿Qué es?
  { id: "t01", text: "Guía de principios", branches: ["def"], clue: "No trae requisitos de un sistema de gestión: orienta con principios. Es parte de su definición." },
  { id: "t02", text: "Órgano de gobierno", branches: ["def"], clue: "Es a quién va dirigida: consejo, junta o socios." },
  { id: "t03", text: "Eficaz, eficiente y aceptable", branches: ["def"], clue: "Así debe ser el uso de las TI según la definición de la norma." },
  { id: "t04", text: "ISO/IEC JTC 1/SC 40", branches: ["def"], clue: "Es el subcomité que la emite." },
  { id: "t05", text: "Edición 2024", branches: ["def"], clue: "Es la versión vigente (3.ª edición)." },
  { id: "t06", text: "No certifica organizaciones", branches: ["def"], clue: "Dato de la definición: las organizaciones declaran alineación, no se certifican." },
  // Resultados (ISO 37000)
  { id: "t07", text: "Desempeño eficaz", branches: ["res"], clue: "Es uno de los 3 resultados que busca, heredados de ISO 37000." },
  { id: "t08", text: "Administración responsable", branches: ["res"], clue: "Es uno de los 3 resultados: uso responsable de los recursos (stewardship)." },
  { id: "t09", text: "Comportamiento ético", branches: ["res"], clue: "Es uno de los 3 resultados: cultura ética, transparencia y rendición de cuentas." },
  // Modelo
  { id: "t10", text: "Evaluar", branches: ["mod"], clue: "Es un verbo: algo que HACE el consejo con las TI." },
  { id: "t11", text: "Dirigir", branches: ["mod"], clue: "Es un verbo: el consejo marca estrategias y políticas." },
  { id: "t12", text: "Monitorear", branches: ["mod"], clue: "Es un verbo: el consejo revisa el desempeño que reporta la gerencia." },
  { id: "t13", text: "Involucrar", branches: ["mod"], clue: "Es la tarea que la edición 2024 añadió a lo que hace el consejo." },
  // Principios (ISO 37000)
  { id: "t14", text: "Propósito", branches: ["pri"], clue: "Es el principio primario, el que está por encima de todos." },
  { id: "t15", text: "Generación de valor", branches: ["pri"], clue: "Es uno de los 4 principios fundamentales." },
  { id: "t16", text: "Estrategia", branches: ["pri"], clue: "Es uno de los 4 principios fundamentales." },
  { id: "t17", text: "Supervisión", branches: ["pri"], clue: "Es un sustantivo: uno de los 4 principios fundamentales." },
  { id: "t18", text: "Liderazgo", branches: ["pri"], clue: "Es uno de los 6 principios habilitantes." },
  { id: "t19", text: "Datos y decisiones", branches: ["pri"], clue: "Es uno de los 6 principios habilitantes." },
  { id: "t20", text: "Gobernanza del riesgo", branches: ["pri"], clue: "Es uno de los 6 principios habilitantes." },
  { id: "t21", text: "Responsabilidad social", branches: ["pri"], clue: "Es uno de los 6 principios habilitantes." },
  // Marco
  { id: "t22", text: "Dirección", branches: ["mar"], clue: "Es un sustantivo: uno de los 6 elementos del marco (orientar el uso de las TI)." },
  { id: "t23", text: "Capacidad", branches: ["mar"], clue: "Es un elemento del marco: identificar las capacidades digitales clave." },
  { id: "t24", text: "Política", branches: ["mar"], clue: "Es un elemento del marco: reglas que guían el uso de las TI." },
  { id: "t25", text: "Delegación", branches: ["mar"], clue: "Es un elemento del marco: repartir autoridad con supervisión." },
  { id: "t26", text: "Desempeño", branches: ["mar"], clue: "Sin «eficaz»: es el elemento del marco que fija expectativas y las monitorea." },
  // También es principio fundamental en la norma, así que ambas ramas son correctas.
  { id: "t27", text: "Rendición de cuentas", branches: ["mar", "pri"], clue: "Está en el marco (demostrar el cumplimiento) y también es un principio fundamental." },
  // Familia e IA
  { id: "t28", text: "ISO/IEC 38503", branches: ["fam"], clue: "Es la norma hermana que sirve para EVALUAR el gobierno de TI." },
  { id: "t29", text: "ISO/IEC 38507", branches: ["fam"], clue: "Es la norma hermana que lleva el gobierno de TI a la IA." },
  { id: "t30", text: "ISO/IEC 42001", branches: ["fam"], clue: "Es el sistema de GESTIÓN de IA (PHVA) que complementa a la 38500." },
  { id: "t31", text: "Reglamento (UE) 2024/1689", branches: ["fam"], clue: "Es la ley de IA de la Unión Europea, obligatoria allá; las ISO son voluntarias." },
];
