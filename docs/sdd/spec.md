# Spec — Panel único de liderazgo

> Etapa 2 de SDD. Define **cómo se comporta** el sistema y **cómo sabemos que está bien** (criterios de aceptación).
> Lee de `intent.md`. No define tecnología: eso va en `plan.md`.
>
> Estado: **borrador para revisión** · Fecha: 2026-10-09

Prioridad de cada módulo: **P0** = imprescindible para la demo · **P1** = deseable · **P2** = si sobra tiempo.

---

## 1. Glosario

| Término | Definición |
|---|---|
| **Cuenta** | Un cliente de Flockit (ej. "Banco Austral"). Agrupa proyectos. |
| **Proyecto** | Un proyecto de una cuenta, vinculado a **una conexión de Jira + un board**. |
| **Conexión** | Credenciales de un sitio de Jira Cloud (site + email + API token). |
| **Sprint** | Un sprint de Jira de ese board: nombre, fecha de inicio, fecha de fin, fecha de cierre real y estado (futuro, activo, cerrado). Se identifica por su **id de Jira**, nunca por el número del nombre (la numeración se reinicia). |
| **Issue terminada** | Issue cuyo estado pertenece a la **categoría Done** de Jira (`statusCategory = done`). |
| **Fecha de finalización** | La **última** vez que la issue entró a un estado de categoría Done, según su changelog. Si la reabrieron y volvieron a cerrar, vale la última. Si no hay changelog, se usa `resolutiondate`. |
| **SP** | Story points de la issue, leídos del campo configurado en la conexión. Sin valor = 0 y la issue se marca "sin estimar". |

---

## 2. Roles y permisos

| Acción | Admin | Team Manager | Cliente (P2) |
|---|:-:|:-:|:-:|
| Ver panel de cartera | ✅ todas las cuentas | ✅ sus proyectos | ❌ |
| Ver detalle de proyecto y cumplimiento | ✅ | ✅ sus proyectos | ✅ solo su cuenta, lectura |
| ABM de conexiones de Jira | ✅ | ❌ | ❌ |
| ABM de cuentas y proyectos | ✅ | ❌ | ❌ |
| ABM de usuarios | ✅ | ❌ | ❌ |
| Cargar NPS / CSAT | ✅ | ✅ sus proyectos | ❌ |
| Generar informes | ✅ | ✅ sus proyectos | ❌ (ve los publicados para él) |
| Asistente / MCP | ✅ | ✅ (las tools respetan sus proyectos) | ❌ |
| Recibir notificaciones | ✅ todas | ✅ sus proyectos | ❌ |

- **"Sus proyectos"**: los que el admin le asignó al Team Manager.
- **Todos los permisos se validan en el backend.** Que el front oculte un botón es comodidad, no seguridad.

---

## 3. Autenticación (P0)

### 3.1 Admin inicial
- El backend crea o actualiza al admin al arrancar, a partir de dos variables de entorno: `ADMIN_EMAIL` y `ADMIN_PASSWORD_HASH`. La contraseña nunca va en texto plano, ni siquiera en el `.env`.
- El repo incluye un script para generar el hash: `generar-hash "mi-contraseña"`.
- Si faltan esas variables, el backend **no arranca** y lo explica en el log.

### 3.2 Login con contraseña
- La pantalla pide email y contraseña, con validación en vivo y la opción de mostrar u ocultar la contraseña.
- Si las credenciales fallan, el mensaje es genérico ("Email o contraseña incorrectos"). Nunca revela cuál de los dos falló.
- **Límite de intentos**: 5 intentos fallidos por email+IP en 15 minutos bloquean 15 minutos, con un mensaje que dice cuándo reintentar.
- La sesión es una cookie `httpOnly`, `Secure` y `SameSite=Lax`, firmada con `SESSION_SECRET`. Vence en 8 horas y se renueva con la actividad.
- Cerrar sesión invalida la sesión en el servidor, no solo borra la cookie.

### 3.3 Passkey (P1)
- Ya logueado, el usuario puede registrar una passkey (huella, Windows Hello o Touch ID) desde su perfil.
- En el login aparece **"Entrar con passkey"**, que usa WebAuthn sin contraseña.
- Puede tener varias passkeys, ver la lista (nombre, fecha de alta, último uso) y borrarlas.

### 3.4 Usuarios (P1)
- El admin da de alta usuarios con nombre, email, rol (`team_manager` o `cliente`) y proyectos o cuenta asignados.
- El alta genera una **contraseña temporal de un solo uso**, que se muestra una sola vez. Al primer ingreso el usuario tiene que cambiarla.
- Los usuarios se pueden deshabilitar y su sesión se corta. No se borran, para mantener la auditoría.

### 3.5 Pantalla de login (diseño)
- Layout partido. A la izquierda, el gradiente de marca Flock con un **preview animado del panel** (gráfico de planificados vs quemados que se dibuja, KPIs que cuentan). A la derecha, el formulario.
- En celular se ve solo el formulario, con el gradiente de fondo.
- Modo claro y oscuro. Se respeta `prefers-reduced-motion` (sin animación).

**Criterios de aceptación**
- [ ] Sin `ADMIN_EMAIL` o `ADMIN_PASSWORD_HASH`, el backend no arranca.
- [ ] Con credenciales correctas entro; con cualquiera incorrecta veo el mismo mensaje genérico.
- [ ] Al sexto intento fallido en 15 minutos quedo bloqueado, incluso con la contraseña correcta.
- [ ] Toda ruta de la API sin sesión válida responde 401; con sesión pero sin permiso responde 403.
- [ ] La cookie de sesión no es accesible desde JavaScript.
- [ ] (P1) Registro una passkey y después entro sin contraseña.

---

## 4. Conexiones de Jira — ABM (P0)

### 4.1 Campos
| Campo | Regla |
|---|---|
| Nombre | Obligatorio, único (ej. "Jira Banco Austral") |
| Site | Obligatorio. Formato `https://<algo>.atlassian.net` |
| Email | Obligatorio |
| API token | Obligatorio al crear. **Se guarda cifrado** (AES-256-GCM con `ENCRYPTION_KEY`). Nunca vuelve al front: se muestra enmascarado (`••••••••abcd`). Al editar, si se deja vacío se conserva el actual. |
| Campo de story points | Se **detecta solo** al probar la conexión (busca en `/rest/api/3/field` el que se llame "Story Points" o "Story point estimate"). Se puede cambiar desde un desplegable con los campos numéricos del sitio. |
| Excluir sub-tareas | Activado por defecto: las sub-tareas no suman SP (en Jira heredan el sprint del padre y duplicarían puntos). |

### 4.2 Comportamiento
- **Probar conexión** llama a `/rest/api/3/myself` y devuelve el usuario de Jira con el que se conectó, o un error claro: credenciales inválidas, site inexistente, sin permisos o timeout.
- No se puede guardar una conexión que no pasó la prueba.
- Se lista con nombre, site, email, estado (✅ OK / ⚠️ error en la última lectura), fecha de la última lectura y cantidad de proyectos que la usan.
- **Baja**: si hay proyectos que la usan, se pide confirmación escribiendo el nombre de la conexión y se desvinculan esos proyectos. Los datos históricos guardados se conservan.
- Cada alta, edición y baja queda registrada en la auditoría: quién, cuándo y qué cambió, **sin el token**.

### 4.3 Conexión de demo
- Existe siempre una conexión **"Demo (datos sintéticos)"** que no llama a Jira y devuelve datos ficticios con la misma forma que la API real.
- Sirve para que el deploy público funcione sin credenciales reales y para los tests.

**Criterios de aceptación**
- [ ] Creo una conexión con datos válidos; la prueba muestra mi usuario de Jira y detecta el campo de SP.
- [ ] Con un token inválido, la prueba falla con "Credenciales inválidas" y no me deja guardar.
- [ ] Ninguna respuesta de la API (ni siquiera la de edición) incluye el token en claro.
- [ ] En la base, el token está cifrado (no coincide con el texto original).
- [ ] La conexión Demo funciona sin variables de Jira.

---

## 5. Cuentas y proyectos (P0)

- **Cuenta**: nombre y logo (opcional).
- **Proyecto**: nombre, cuenta, conexión y **board** (desplegable con todos los boards que el usuario de la conexión puede ver — scrum, kanban y team-managed — vía `/rest/agile/1.0/board`, sin filtrar por tipo), y Team Managers asignados. Un board que no usa sprints deja la medición vacía.
- Al vincular un board se traen sus sprints. Se puede elegir **desde qué sprint** se mide, para ignorar sprints viejos o de prueba.

**Criterios de aceptación**
- [ ] Creo un proyecto, elijo conexión y board de un desplegable (no tipeo ids) y veo sus sprints.
- [ ] Un Team Manager solo ve los proyectos que tiene asignados, en el front y en la API.

---

## 6. Lectura de Jira (P0)

- Por cada sprint se trae: datos del sprint (`/rest/agile/1.0/board/{id}/sprint`) e issues del sprint (`/rest/agile/1.0/sprint/{id}/issue`, paginado), con los campos estado, categoría de estado, responsable, tipo, SP, resolutiondate y el **changelog** (`expand=changelog`) para obtener la fecha de finalización.
- **Caché stale-while-revalidate** (la idea de Flock Platform):
  - Datos de menos de 5 minutos: se sirven directo.
  - De 5 minutos a 24 horas: se sirven y se relee Jira en segundo plano.
  - Sprints **cerrados** ya calculados se guardan como foto y no se vuelven a leer, salvo con "Recalcular" manual.
- Se respetan los límites de Jira: si devuelve 429, se reintenta con espera exponencial y se muestra "Jira está limitando consultas, reintentando…".
- **Solo lectura**: la app nunca escribe en Jira.
- **Texto externo**: títulos y descripciones de Jira se tratan como **datos no confiables**. Se escapan al mostrarlos y, si van al LLM, viajan marcados como dato externo (ver §10).
- **Webhooks de Jira (P2)**: endpoint opcional que recibe `sprint_closed` e `issue_updated` para invalidar la caché. Se valida la firma HMAC (`X-Hub-Signature`) y se deduplica por `X-Atlassian-Webhook-Identifier`.

---

## 7. Motor de cumplimiento (P0) — el corazón

### 7.1 Algoritmo (metodología de auditoría)

Para cada sprint **S** de un proyecto:

1. **Issues del sprint** = issues cuyo campo Sprint de Jira **contiene S**. Jira conserva en ese campo los sprints cerrados por los que pasó la issue y quita los sprints de los que se la sacó antes del cierre. Se excluyen las sub-tareas si la conexión lo indica.
2. **Planificados(S)** = Σ SP de las issues del sprint, **sin importar su estado**.
3. **Sprint de quemado** de una issue terminada *i* con sprints S₁…Sₙ (ordenados por fecha de inicio) y fecha de finalización *f*:
   - el **primer** Sₖ cuya fecha de fin efectiva (cierre real, o fin planificado si está activo) sea **≥ f**;
   - si no hay ninguno (se terminó después del último sprint), **el último Sₙ**.
4. **Quemados(S)** = Σ SP de las issues **terminadas** cuyo sprint de quemado es S. **No duplicación**: cada issue quema en un solo sprint.
5. **Corte por sprint**: cada sprint se calcula solo con sus issues. No hay arrastre ni redistribución.
6. **Cumplimiento(S)** = Quemados(S) ÷ Planificados(S). Si Planificados = 0 se muestra "—", no 0 % ni error.

> Consecuencia de las reglas 2 y 4: una issue que pasó por S1 y S2 y se terminó en S2 suma **planificados en S1 y en S2**, pero **quemados solo en S2**.

### 7.2 Agregados
- **Por persona** (dentro de un sprint): planificados y quemados agrupados por **responsable actual** de la issue. Las issues sin responsable van a "Sin asignar".
- **Por mes**: Σ quemados ÷ Σ planificados de los sprints cuya **fecha de fin** cae en ese mes.
- **Sprint activo**: se muestra como **provisorio** (badge "En curso") y no entra en el mes hasta cerrar.

### 7.3 Auditoría
- Todo número tiene un **"ver detalle"** que abre una página del sprint (no un panel lateral). Arriba, tarjetas por estado y el objetivo del sprint si Jira lo trae. Abajo, una tabla paginada con filtros (texto, estado, responsable, motivo) y export. Cada fila trae: clave (con link a Jira), título, tipo, SP, estado, responsable, sprints por los que pasó, fecha de finalización, sprint de quemado y **motivo** ("terminada dentro del sprint", "terminada después del último sprint", "no terminada", "sin estimar").
- Se avisa de: issues sin estimar, issues con SP cambiado durante el sprint (si el changelog lo muestra) y sprints sin issues.

### 7.4 Casos de prueba obligatorios (tests unitarios del motor)

| # | Caso | Esperado |
|---|---|---|
| T1 | Sprint con 3 issues (5, 3, 2 SP), 2 terminadas dentro del sprint (5, 3) | Plan 10 · Quem 8 · 80 % |
| T2 | Issue de 8 SP en S1 y S2, terminada durante S2 | S1: plan +8, quem 0 · S2: plan +8, quem +8 |
| T3 | Issue de 5 SP en S1 y S2, terminada durante S1 y reabierta y re-terminada durante S2 | Quema en S2 (vale la última finalización) |
| T4 | Issue de 3 SP solo en S1 (cerrado), terminada 4 días después del cierre | Quema en S1 (default de la regla 4) |
| T5 | Issue de 3 SP en S1 y S2, terminada en el hueco entre el cierre de S1 y el inicio de S2 | Quema en S2 (primer sprint con fin ≥ fecha) |
| T6 | Issue sin SP terminada | Suma 0 y aparece en "sin estimar" |
| T7 | Sub-tarea con SP y la conexión excluye sub-tareas | No suma |
| T8 | Estado "Cerrado", "Finalizada" y "Done" (todos categoría Done) | Los tres cuentan como terminada |
| T9 | Estado "QA Aprobado" de categoría *In Progress* | No cuenta como terminada |
| T10 | Sprint sin issues | Plan 0 · "—" |
| T11 | Mes con sprints de 54/18 y 57/41 SP | Mes: 59/111 = 53,2 % |
| T12 | Regresión con los totales anonimizados del Excel actual (14 sprints) | Los meses dan oct 55,8 % · nov 43,8 % · dic 77,2 % · feb 94,7 % |

---

## 8. Satisfacción: NPS y CSAT (P1)

### 8.1 Carga manual
- Desde un proyecto: **"Registrar respuesta"** con tipo (NPS o CSAT), período (un sprint del proyecto o un mes), quién respondió (opcional), puntajes y comentario.
  - **NPS**: una pregunta, "¿Qué tan probable es que nos recomiendes?", escala **1–10**.
  - **CSAT**: tres preguntas en escala **1–10**: satisfacción del mes, progreso del proyecto y gestión del proyecto.
- Cada respuesta se puede editar y borrar, y queda en la auditoría.

### 8.2 Fórmulas (como Flocktools)
- **NPS** = %promotores (9–10) − %detractores (1–6), con 1 decimal. Los pasivos (7–8) cuentan en el total. Siempre se calcula desde las respuestas crudas, **nunca promediando NPS de períodos**.
- **CSAT** = promedio de las 3 preguntas por respuesta, y después el promedio entre respuestas, con 1 decimal. Tramos: 9–10 muy satisfecho · 7–8 satisfecho · 5–6 neutro · 1–4 insatisfecho.
- NPS y CSAT nunca se mezclan.

**Criterios de aceptación**
- [ ] 10 respuestas NPS: 5 de 9–10, 3 de 7–8 y 2 de 1–6 → NPS = 30,0.
- [ ] CSAT de 2 respuestas (9, 8, 10) y (6, 7, 8) → (9 + 7) / 2 = 8,0.

---

## 9. Pantallas

### 9.1 Panel de cartera — Inicio (P0)
- **KPIs de cartera**: proyectos activos · cumplimiento del último mes cerrado (suma de puntos) · proyectos en alerta · NPS y CSAT del trimestre (P1).
- **Una card por proyecto** con:
  - cuenta y nombre;
  - sprint activo: día X de Y y planificados vs quemados provisorio;
  - cumplimiento de los **últimos 6 sprints cerrados** (mini barras);
  - cumplimiento del mes;
  - NPS y CSAT del último período (P1);
  - semáforo.
- **Semáforo** de cumplimiento del último sprint cerrado: **≥ 85 %** en margen · **70–84 %** atención · **< 70 %** en riesgo. Los umbrales son configurables por el admin.
- Ordenado por riesgo primero, con filtros por cuenta y estado.
- **Accesibilidad**: los colores siempre van con texto y número, nunca color solo. Se usan los tonos de estado aptos para daltonismo de Flock Platform.

### 9.2 Detalle de proyecto (P0)
- **Gráfico** planificados vs quemados por sprint (barras agrupadas) con la línea de cumplimiento %.
- **Tabla por sprint**: nombre, fechas, planificados, quemados, %, sin estimar y "ver detalle" (§7.3).
- **Tabla por persona** del sprint seleccionado.
- **Tabla por mes.**
- Pestaña **Satisfacción** con la evolución de NPS y CSAT y las respuestas (P1).
- **Toda tabla se exporta a Excel y a PDF** (regla de Flock).

### 9.3 Informes (P0: sprint · P2: cliente)
- **Informe de sprint**: elegís proyecto, sprint y audiencia (equipo, cliente o gerencia). Contiene:
  - encabezado con la marca;
  - **objetivo del sprint** tal como viene de Jira (si no hay, se dice);
  - KPIs del sprint;
  - gráfico de planificados vs quemados de los últimos sprints, con la línea de cumplimiento;
  - corte por **tipo de issue** (cantidad, SP planificados y SP quemados);
  - por persona: planificados vs quemados, y las issues que cerró en este sprint y las que siguen abiertas;
  - issues no terminadas;
  - NPS y CSAT del período (si hay);
  - **narrativa con IA**, que contrasta la entrega contra el objetivo sin inventar alcance.
- **Informe de cliente** (P2): por cuenta y mes, con todos sus proyectos, cumplimiento del mes, tendencia y satisfacción.
- **Narrativa con IA**: recibe **solo los números ya calculados** y redacta un resumen en 3 o 4 oraciones según la audiencia. Si la IA falla, el informe se genera igual sin narrativa. El texto se puede editar antes de guardar.
- **Guardar** congela el informe como una **foto inmutable** (datos + narrativa + fecha + autor). El historial lista los informes guardados.
- **Exportar a PDF** con la marca.

**Criterios de aceptación**
- [ ] Genero el informe de un sprint cerrado y los números coinciden exactamente con el detalle del proyecto.
- [ ] Con la key de IA inválida, el informe se genera igual, con un aviso de "narrativa no disponible".
- [ ] Un informe guardado no cambia aunque después cambien los datos de Jira.

### 9.4 Configuración (P0/P1)
- Pestañas: **Conexiones** (P0) · **Cuentas y proyectos** (P0) · **Usuarios** (P1) · **Umbrales y alertas** (P1) · **Auditoría** (P1).

### 9.5 Marca (P0, no configurable)
- La app usa **un solo tema: el que tiene configurado hoy Flock Platform** en Configuración → Marca (leído el 2026-10-09). No hay selector de temas.
- Todo vive en **un único CSS**: `frontend/src/styles/flock-brand.css`. Incluye tokens de modo claro y oscuro, menú lateral claro, banner con gradiente, botones de marca, semáforo, estados de issue, modal Flock Card, toasts, notificaciones y login `flock_modern`.
- Ningún componente hardcodea colores: todos usan las variables de ese archivo.

### 9.5.b Tablero de Jira (P0) — inspirado en el portal de Flock Platform

Pestaña **Tablero** en el detalle de proyecto, con el **sprint activo** en vivo y de solo lectura.

- **Encabezado:** nombre del sprint, "día X de Y hábiles" (lunes a viernes) y el **% de tiempo transcurrido** contra el **% de tarjetas finalizadas**.
- **Carriles** según la categoría de estado de Jira:
  - **No iniciado** = categoría *To Do*.
  - **En curso** = categoría *In Progress*.
  - **Finalizado** = categoría *Done*.
  - **Bloqueado** = estado cuyo nombre habla de bloqueo o espera ("bloque", "blocked", "imped", "espera", "on hold"), o issue con flag en Jira. Tiene prioridad sobre los otros carriles, salvo Finalizado.
- **5 tarjetas de resumen:** Total · No iniciadas · En curso · Bloqueadas · Finalizadas.
- **Torta** con selector: estado (los 4 carriles), prioridad o tipo.
- **Kanban** de 4 columnas y **vista tabla** con filtros (responsable, tipo, texto) y export Excel/PDF.
- **Ficha de issue:** clave, título, estado, carril, responsable, SP, prioridad, tipo, etiquetas y última actualización.
- **Refresco automático** cada 60 s (caché de 60 s en el backend).
- Colores de carril: los tokens de estado aptos para daltonismo (`--todo`, `--doing`, `--blocked`, `--done`), siempre con nombre y número.
- Sin sprint activo: se muestra el último sprint cerrado, con un aviso.

**Criterios de aceptación**
- [ ] Con la conexión Demo, el tablero muestra las 4 columnas y los totales coinciden con la suma de cada carril.
- [ ] Una issue en estado "Bloqueado" o con flag cae en el carril Bloqueado.
- [ ] "Día X de Y" cuenta solo días hábiles.
- [ ] Un Team Manager no ve el tablero de un proyecto ajeno (403).

**Después:** portal del cliente (rol cliente que ve solo su cuenta) y resumen semanal con IA.

### 9.6 Notificaciones (P1)

**Eventos que generan un aviso:**

| Evento | Cuándo se dispara | Contenido |
|---|---|---|
| **Inicio de sprint** | Un sprint pasa a activo en Jira | Nombre, fechas, objetivo, planificados y **cuántas issues no tienen SP** |
| **Cierre de sprint** | Un sprint pasa a cerrado | Planificados vs quemados, cumplimiento % con semáforo y link al detalle |
| **Issues sin story points** | Al iniciar el sprint, y de nuevo al día hábil 2 si siguen sin estimar | Lista de issues sin estimar con responsable |
| **Sprint sin iniciar** | Cerró un sprint y pasaron **2 días hábiles** sin uno nuevo activo | Proyecto y fecha del último cierre |
| **Issues sin movimiento** | Issue del sprint activo, no terminada, sin actualizar hace **3 días hábiles** | Issue, responsable y días sin movimiento (un aviso por issue por sprint) |

**Comportamiento:**
- **Canal**: solo dentro de la app. Campanita en el encabezado con un contador de no leídas y un panel lateral con la lista.
  - Cada aviso se puede marcar como leído y lleva link a la pantalla correspondiente.
  - Botón "Marcar todas como leídas".
- **Destinatarios**: los Team Managers del proyecto y el admin.
- **Detección**: un proceso del backend revisa los proyectos **cada 15 minutos** comparando el estado de los sprints con la última lectura guardada. Si están activos los webhooks de Jira (P2), el aviso es inmediato.
- **Sin duplicados**: cada evento se notifica una sola vez. La clave es tipo + proyecto + sprint (+ issue).
- **Configurable** en Umbrales y alertas: activar o desactivar cada tipo, y los días hábiles de "sin iniciar" y "sin movimiento".
- Los días hábiles excluyen sábados y domingos. Los feriados quedan fuera de alcance.

**Criterios de aceptación**
- [ ] En la conexión Demo, simular el cierre de un sprint genera **un** aviso de cierre con el cumplimiento correcto. Volver a correr el proceso no lo duplica.
- [ ] Un sprint que inicia con 2 issues sin SP genera el aviso de inicio, que menciona esas 2 issues.
- [ ] Una issue sin cambios hace 3 días hábiles genera el aviso de "sin movimiento". Si hace 2, no.
- [ ] Un Team Manager no recibe avisos de proyectos que no son suyos.

## 10. Asistente y MCP (P1)

### 10.1 Tools (todas de solo lectura)
| Tool | Devuelve |
|---|---|
| `listar_proyectos` | Proyectos visibles para el usuario, con su estado |
| `cumplimiento_sprint(proyecto, sprint?)` | Planificados, quemados, %, por persona y detalle |
| `cumplimiento_mensual(proyecto?, mes)` | Agregado mensual por proyecto o cartera |
| `tendencia(proyecto, n_sprints)` | Serie de los últimos N sprints |
| `issues_no_terminadas(proyecto, sprint)` | Lista con responsable y SP |
| `satisfaccion(proyecto?, periodo)` | NPS y CSAT |
| `proyectos_en_riesgo()` | Proyectos bajo umbral, con motivo |

### 10.2 Asistente en la app
- Es un widget flotante (**Asistente TM**) abajo a la derecha: se abre, se agranda y se minimiza sin tapar la página; conserva la conversación en la pestaña. En el celular ocupa toda la pantalla.
- La respuesta viene con formato (Markdown: negritas, listas, tablas) y **tarjetas visuales** armadas con la salida de las tools (sprint con medidor, riesgo con semáforo, tendencia, tablero, issues). Los números de las tarjetas salen del motor, no del texto del modelo.
- El modelo decide qué tools llamar, con un **máximo de 5 llamadas por turno**.
- Las tools **filtran por los permisos del usuario**: un Team Manager no puede consultar proyectos ajenos aunque lo pida.
- **Los números de la respuesta salen de las tools.** El prompt prohíbe calcular y exige citar el sprint o mes de cada dato.
- El texto de Jira que devuelven las tools viaja marcado como dato externo. Si un título contiene algo como "ignorá las instrucciones…", **no se sigue** y se avisa al usuario.

### 10.3 MCP server
- Expone las mismas tools por MCP para usar el panel desde Claude Code o Cursor.
- Se autentica con un **token personal** que el usuario genera en su perfil: va como header, se guarda hasheado y se puede revocar. Respeta los permisos de ese usuario.

### 10.4 Observabilidad
- Cada turno del asistente registra modelo, tools llamadas con sus argumentos, tokens de entrada y salida, costo estimado y latencia.

### 10.5 Evals
- Golden set de **al menos 15 preguntas** con respuesta esperada: qué tools se llaman y qué números aparecen.
- Se corre en CI con los datos de demo.

**Criterios de aceptación**
- [ ] "¿Cómo cerró el último sprint de Portal Clientes?" responde con los mismos números que la pantalla.
- [ ] Un Team Manager pregunta por un proyecto que no es suyo → el asistente responde que no tiene acceso.
- [ ] Una issue de demo con texto de prompt injection no altera la respuesta y el asistente lo avisa.
- [ ] Desde Claude Code, con el MCP configurado, consulto `proyectos_en_riesgo` y obtengo el mismo resultado que en el panel.

---

## 11. Requisitos no funcionales

| Tema | Requisito |
|---|---|
| **Seguridad** | Secretos solo en variables de entorno del backend. Tokens de Jira cifrados. Contraseñas con hash (argon2id o bcrypt). Cookies seguras. Rate limit en login. CORS limitado al dominio del front. Headers de seguridad (CSP, HSTS). Validación de todo input en el backend. |
| **Privacidad** | El repo es público: solo datos sintéticos. Nada de nombres reales de clientes ni personas en código, tests o fixtures. |
| **Auditoría** | Login (OK y fallido), ABM de conexiones, usuarios y proyectos, cambios de umbrales, informes guardados y respuestas NPS/CSAT. |
| **Performance** | El panel carga en menos de 2 s con datos en caché. Con Jira en frío muestra esqueleto de carga y datos parciales. |
| **UX** | Español rioplatense. Responsive (desde 400 px). Modo claro y oscuro. Estados vacíos, de carga y de error en cada pantalla. Tipografía DM Sans y tokens de marca Flock. |
| **Accesibilidad** | Contraste AA. Color nunca solo. Navegable con teclado. `prefers-reduced-motion`. |
| **Calidad** | Tests del motor de cumplimiento (§7.4) y de las fórmulas NPS/CSAT. Lint y tests en CI para front y back. |

---

## 12. Fuera de alcance
- Escritura en Jira.
- Envío de encuestas por mail.
- OAuth de Atlassian (alcanza con API token).
- Horas y presupuesto (son de Flock Platform).
- Login con Microsoft (queda documentado como evolución).
