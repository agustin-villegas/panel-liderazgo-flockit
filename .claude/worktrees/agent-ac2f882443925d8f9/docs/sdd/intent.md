# Intent — Panel único de liderazgo

> Etapa 1 de SDD (intent → spec → plan). Define **qué** problema resolvemos y **para quién**.
> No define tecnología: eso se decide en `plan.md`.
>
> Estado: **borrador para revisión** · Autor: Agustín Villegas · Fecha: 2026-10-09 · Contexto: AI Day Flockit, challenge "Panel único de liderazgo" (nivel Builder)

## 1. El problema

Un Team Manager de Flockit arma la foto de sus proyectos saltando entre herramientas sueltas:

- **Jira** para ver cómo viene el sprint (issues, estados, story points).
- **Flocktools** para NPS, CSAT y los **puntos planificados vs quemados** de cada sprint.
- **Flock Platform** para horas, informes, portal de clientes y dashboards de Jira.
- Informes de sprint y de cliente armados a mano a partir de todo lo anterior.

**Qué encontramos al analizar las dos herramientas** (2026-10-09):

- **Ninguna calcula planificados vs quemados desde Jira con la metodología de auditoría.**
  - Flocktools los **carga a mano o importa de un Excel**.
  - El indicador ISO de Flocktools **promedia porcentajes** en lugar de sumar puntos, así que un sprint chico pesa igual que uno grande.
  - Flock Insight (en Flocktools) **arrastra puntos de sprints previos**, lo que contradice la regla 5.
  - La **regla 4** (no duplicación) no está implementada en ningún lado.
  - Lo único que Flocktools deriva de Jira usa "sprints" sintéticos de 14 días y nombres de estado hardcodeados (`'Cerrado'`).
- **Flock Platform no tiene story points.** Sus dashboards miden el avance contando tarjetas finalizadas.
- **NPS y CSAT están definidos distinto en cada herramienta** (ver preguntas abiertas).

Consecuencias:
- Cada informe cuesta tiempo de recolección manual.
- El indicador de cumplimiento de sprint **no se puede auditar contra Jira**: depende de que alguien lo cargue bien.
- No hay un lugar donde ver **todos** los proyectos juntos para detectar a tiempo cuál viene mal.

## 2. Para quién

| Rol | Necesita |
|---|---|
| **Admin** | Configurar las conexiones a Jira, dar de alta usuarios y administrar todo |
| **Team Manager** | Ver sus proyectos, medir sprints, registrar NPS/CSAT y generar informes sin armarlos a mano |
| **Cliente** *(si llega el tiempo)* | Ver, solo lectura, los informes y métricas de **su** cuenta |

## 3. Qué tiene que resolver (flujos)

1. **Entrar de forma segura.** Login moderno. El admin inicial sale de variables de entorno (usuario + hash de la contraseña, nunca en texto plano). El admin da de alta al resto de los usuarios.
2. **Conectar Jira (ABM de conexiones).** Alta, edición, prueba y baja de conexiones a Jira Cloud (site + email + API token). Los tokens se guardan cifrados y nunca vuelven al navegador. Cada proyecto se vincula a su board.
3. **Medir cada sprint con la metodología de auditoría** (reemplaza el cálculo de Flocktools):
   1. Se consideran todas las issues que tengan asignado ese sprint en Jira.
   2. **Planificados** = suma de story points de todas las issues del sprint, sin importar su estado.
   3. **Quemados** = suma de story points de las issues del sprint en estado **FINALIZADA**.
   4. **No duplicación**: una issue que figura en varios sprints computa como quemada **solo en el sprint en que se finalizó**.
   5. **Corte por sprint**: cada sprint es una foto independiente, sin arrastre ni redistribución de puntos.
4. **Registrar satisfacción.** Carga de NPS y CSAT por cuenta, proyecto o sprint. Se calculan siempre desde las respuestas crudas, nunca promediando scores, y NPS y CSAT nunca se mezclan. Fórmulas: las de Flocktools (ver Decisiones).
5. **Ver todo junto.** Un panel con todos los proyectos: avance del sprint, planificados vs quemados, tendencia de cumplimiento, NPS y CSAT. Señala qué proyecto requiere atención.
6. **Generar informes.** Informe de sprint e informe de cliente generados desde los datos. La IA redacta la lectura ejecutiva **sobre números ya calculados** y nunca hace las cuentas. Cada informe generado queda como una foto que no se edita, y se exporta.
7. **Enterarse a tiempo.** Avisos dentro de la app de inicio y cierre de sprint, issues sin story points, sprint sin iniciar e issues sin movimiento.
8. **Preguntarle al panel** *(capa de IA)*. Consultas en lenguaje natural ("¿qué proyecto quemó menos de lo planificado los últimos 3 sprints?") resueltas con tools sobre los mismos datos, y expuestas también como **MCP server** para usarlas desde Claude Code o Cursor.

## 4. Principios no negociables

- **Los números los calcula el sistema, no el LLM.** La IA interpreta y redacta.
- **Seguridad primero.** Cero secretos en el repo, tokens cifrados, el cliente solo ve su cuenta (lo filtra el backend), y el texto que viene de Jira se trata como dato, nunca como instrucción.
- **El repo es público.** Los datos de demo son sintéticos; nada de datos reales de clientes.
- **Frontend y backend separados** (`frontend/` y `backend/`). El front nunca habla directo con Jira ni con el modelo.
- **Una sola identidad visual: el tema actual de Flock Platform** (Clásico púrpura + naranja, DM Sans), sin selector de temas.
- **Reusar ideas probadas de Flock Platform** (stale-while-revalidate de Jira, informes como foto congelada, avance en días hábiles) sin copiar su complejidad.

## 5. Éxito para la demo de hoy

**Imprescindible:**
- [ ] Login seguro funcionando (admin desde variables de entorno).
- [ ] ABM de conexión a Jira, con prueba de conexión.
- [ ] Planificados vs quemados por sprint con las 5 reglas, **cubiertas por tests**, sobre todo la de no duplicación.
- [ ] Panel con todos los proyectos.
- [ ] Un informe de sprint generado y exportable.

**Deseable:**
- [ ] Carga de NPS y CSAT y su tendencia en el panel.
- [ ] Consultas en lenguaje natural y MCP server.
- [ ] Alta de usuarios Team Manager.
- [ ] Notificaciones dentro de la app.

**Si sobra tiempo:**
- [ ] Rol cliente con vista de su cuenta.
- [ ] Informe de cliente.

## 6. Fuera de alcance (hoy)

- Envío de encuestas por mail (en Flock Platform ya existe); hoy NPS y CSAT se cargan a mano.
- OAuth de Atlassian (alcanza con API token).
- Carga de horas y presupuesto: es el terreno de Flock Platform. Queda como integración futura vía API.
- Escritura en Jira: la app **solo lee**.

## 7. Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Login | Usuario + contraseña (admin desde `.env`, con hash) **+ passkey** (huella / Windows Hello) | Moderno, seguro y sin depender de IT |
| "Terminada" | Cualquier estado de la **categoría Done** de Jira (`statusCategory = done`) | Funciona en cualquier board, se llame "Finalizada", "Cerrado" o "Done" |
| NPS | Como Flocktools: escala 1–10, detractores 1–6, pasivos 7–8, promotores 9–10, score = %P − %D con 1 decimal | Es lo que el equipo ya reporta |
| CSAT | Como Flocktools: promedio de 3 preguntas (satisfacción del mes, progreso del proyecto, gestión del proyecto), primero por respuesta y después entre respuestas | Ídem |
| Cumplimiento | **Por sprint**: quemados ÷ planificados. **Por mes**: suma de quemados ÷ suma de planificados de los sprints del mes; cada sprint cae en el mes de su **fecha de fin** | Es la metodología de auditoría, aplicada sobre puntos |

**Defaults que tomamos (se pueden cambiar):**
- **Story points**: se detecta el campo automáticamente buscando en `/rest/api/3/field` el que se llame "Story Points" o "Story point estimate", y se puede corregir en el ABM de la conexión.
- **Regla 4, caso borde**: si una issue se finaliza después de cerrado su último sprint, computa como quemada en ese último sprint.
- **Audiencia**: el informe de sprint es para el equipo y el cliente; el informe de cliente es para el cliente y la gerencia. La IA ajusta el tono según la audiencia.


### Qué mostró el Excel de seguimiento actual (proyecto real, analizado sin copiarlo al repo)

- Tiene **dos tablas cargadas a mano**: "Estimados" (puntos planificados **por persona** y sprint) y "Completados" (planificados y quemados **del equipo** por sprint). Los totales por persona coinciden con los del equipo.
- **No calcula ningún % de cumplimiento**, ni por sprint ni por mes. Ese cálculo hoy se hace afuera.
- El único total (`=SUM(E9:E55)`) **arranca en el sprint 3**: deja afuera los sprints 1 y 2. Es un error típico de la planilla manual.
- Los quemados se cargan **solo a nivel equipo**: no hay quemados por persona.
- **La numeración de sprints se reinicia** cada año y la duración cambia (1 semana en 2025, 2 semanas en 2026). El sprint se identifica por nombre + fechas, no por número.
- Hay datos para revisar: un sprint con 0 quemados de 37 y otro con 131 de 131 (100 % exacto).

**Requisitos que salen de acá:**
- Calcular planificados **y quemados por persona** (sale gratis de Jira, porque cada issue tiene responsable).
- Cada número tiene que poder **auditarse**: desde el % se baja a la lista de issues que lo componen.
- Los datos de prueba se arman con estos **totales anonimizados** (sin nombres de personas ni del cliente) como caso de regresión.

## 8. Preguntas abiertas

Ninguna bloqueante. Se revisan en la spec.
