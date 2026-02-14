# 🔧 Memory Leak Debug: Plan B (Aggressive Analysis)

## Status: ⚠️ CRÍTICO - Fix no funcionó (93% heap después del deploy)

El fix de rate limiter + logger cleaning NO redujo el heap (aún 93%).

## Posible causa raíz:
1. **Railway NO reinició** (aunque push se completó)
2. **Fix INSUFICIENTE** - hay OTRO memory leak mayor no identificado  
3. **Queries sin paginar** acumulan resultados en memoria
4. **Variables globales** en closures retienen referencias

---

## Plan B: Debugging Profundo

### Paso 1: Forzar Restart en Railway
```bash
# En Railway Dashboard:
1. Services → divisando-api
2. Settings → Redeploy (Force)
3. Esperar 2-3 minutos
4. Ver logs para confirmar que los imports nuevos aparecen
```

### Paso 2: Verificar que Fix se aplicó  
Buscar en logs exactamente ESTOS mensajes después de restart:
```
✅ [Nuevo] "Cerrando rate limiter store..."
✅ [Nuevo] "Cerrando loggers..."
```

Si NO aparecen → El código NO se recargó

### Paso 3: Buscar OTRO Memory Leak
Si aún sigue en 93%, entonces hay un leak DIFERENTE. Posibilidades:

**A) Queries sin pagination:**
```javascript
// ❌ MAL: Devuelve TODOS los documentos a memoria
const allUsers = await User.find({});

// ✅ BIEN: Limitar resultados
const recentUsers = await User.find({}).limit(100).lean();
```

**B) Variables globales en closures:**
```javascript
// ❌ MAL: "results" queda en closure y nunca se libera
let results = null;
const saveResults = (data) => {
  results = data; // Retiene referencia
};

// ✅ BIEN: Limpiar explícitamente  
let results = null;
const clearResults = () => {
  results = null; // Liberar memoria
};
```

**C) Axios response no siendo limpia:**
```javascript
// ❌ MAL: response.data queda en memoria
const response = await axios.get(url);
process.data = response.data; // Referencia global

// ✅ BIEN: Extraer solo lo necesario
const { data } = await axios.get(url);
const needed = { rate: data.rate }; // Solo copiar lo esencial
```

---

## Paso 4: Generar Heap Dump (Si aún > 85%)

### Técnica 1: Usar Clinic.js
```bash
cd divisando_serv
npm install clinic
clinic doctor -- node server.js
# Luego hacer traffic durante 1 min
# Clinic generará reporte vs/html
```

### Técnica 2: Node Inspector
```bash
# En Railway, no se puede acceder directo, pero podemos:
node --inspect-brk server.js  # Con breakpoint
# Luego en Chrome: chrome://inspect

# O guardar heap dump a archivo:
node -e "require('v8').writeHeapSnapshot('heap.bin')"
```

### Técnica 3: Agregar logging de memoria agresivo
```javascript
// Agregar a server.js
const memInterval = setInterval(() => {
  const usage = process.memoryUsage();
  console.log(`[MEM] Heap: ${(usage.heapUsed/1024/1024).toFixed(1)}MB / ${(usage.heapTotal/1024/1024).toFixed(1)}MB (${((usage.heapUsed/usage.heapTotal)*100).toFixed(1)}%) | External: ${(usage.external/1024/1024).toFixed(1)}MB`);
}, 10000); // Cada 10 segundos

process.on('SIGTERM', () => {
  clearInterval(memInterval);
  // ... rest of shutdown
});
```

---

## Sospechosos Actuales (Prioridad):

### 🔴 CRÍTICO:
1. **axios response caching** en fetchExchangeRates.js
   - ¿Se está guardando response.data en variables globales?
   
2. **Queries sin `.lean()`** en authController.js
   - Au queries devuelven Mongoose documents completos
   - Son objetos pesados con métodos

3. **winston-logger buffers** en memoria

### 🟠 ALTO:
4. **Rate limiter store** (aunque agregamos shutdown, puede no estar limpiándose)
5. **MongoDB connection pool** (maxPoolSize=10 por defecto)
6. **Event listeners** sin cleanup (aunque buscamos y no encontramos)

---

## Acciones Inmediatas:

### 1. FORZAR RESTART en Railway
- Gateway.js debe estar en versión con imports nuevos
- Verificar que `apiRateLimiter.store` está exportado

### 2. SI SIGUE EN > 90%:
- Agregar logging de memoria cada 10 segundos
- Buscar picos o crecimientos lineales
- Identificar qué está consumiendo

### 3. SI SIGUE EN > 85% DESPUÉS DE 2h:
- Generar heap dump
- Analizar qué objetos son más grandes
- Identificar leak raíz

---

## Alternativas Nucleares (Si todo falla):

### Opción 1: Limitar Node.js Heap más
```javascript
// En package.json start script:
"start": "node --expose-gc --max-old-space-size=256 server.js"
// Reduce de 384MB a 256MB - fuerza GC más agresivo
```

### Opción 2: Implementar Periodic Restart
```javascript
// Cada 4 horas, reiniciar el servidor
const restartInterval = 4 * 60 * 60 * 1000;
setTimeout(() => {
  console.log('📍 Reinicio programado para evitar memory leak');
  process.exit(0); // Railway auto-restarts
}, restartInterval);
```

### Opción 3: Cambiar a Render/Fly.io
- Railway free tier = 512MB heap total
- Render = 512MB también
- Fly.io = 256MB pero mejor optimizado
- Mejor: Aumentar a plan pago

---

## Timelines:

- **Ahora:** Force restart en Railway (5 min)
- **+10 min:** Verificar logs,veir si heap bajó
- **+20 min:** Si NO bajó, agregar logging de memoria
- **+1h30:** Analizar logs, identificar pico/leak
- **+2h:** Si persiste, generar heap dump

---

**ACCIÓN RECOMENDADA AHORA:**
1. Force Restart en Railway Dashboard
2. Esperar 3 minutos
3. Verificar logs si aparecen menciones al nuevo código
4. Si heap sigue > 90%, reportar y proceder con Plan Debug Profundo
