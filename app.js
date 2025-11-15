// 3D Control Center - App JavaScript
// Gestión completa del negocio de impresión 3D

// ========================================
// CONFIGURACIÓN INICIAL Y SERVICE WORKER
// ========================================

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado:', registration);
            })
            .catch(error => {
                console.log('Error al registrar Service Worker:', error);
            });
    });
}

// ========================================
// GESTIÓN DE DATOS - LocalStorage
// ========================================

class DataManager {
    static keys = {
        productos: 'productos',
        insumos: 'insumos',
        pedidos: 'pedidos',
        facturas: 'facturas',
        config: 'config',
        clientes: 'clientes',
        cotizaciones: 'cotizaciones',
        proveedores: 'proveedores',
        compras: 'compras',
        equipos: 'equipos',
        mantenimientos: 'mantenimientos',
        ingresos: 'ingresos',
        gastos: 'gastos'
    };

    static load(key) {
        try {
            const data = localStorage.getItem(key);
            const parsedData = data ? JSON.parse(data) : [];
            
            // Limpiar datos corruptos específicamente para insumos
            if (key === 'insumos' && Array.isArray(parsedData)) {
                return parsedData.filter(item => 
                    item && 
                    typeof item === 'object' && 
                    item.id !== undefined
                ).map(item => ({
                    ...item,
                    peso: parseFloat(item.peso) || 0,
                    costo: parseFloat(item.costo) || 0,
                    tipo: item.tipo || 'Sin tipo',
                    color: item.color || 'Sin color'
                }));
            }
            
            return parsedData;
        } catch (error) {
            console.error(`Error al cargar ${key}:`, error);
            return [];
        }
    }

    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error al guardar ${key}:`, error);
            return false;
        }
    }

    static getConfig() {
        const defaults = {
            nombreNegocio: '3D Control Center',
            telefono: '',
            direccion: '',
            costoHora: 1000,
            margen: 30,
            iva: 13
        };
        
        const config = this.load(this.keys.config);
        return config.length > 0 ? config[0] : defaults;
    }

    static saveConfig(config) {
        return this.save(this.keys.config, [config]);
    }

    static reset() {
        Object.values(this.keys).forEach(key => {
            localStorage.removeItem(key);
        });
        location.reload();
    }
}

// ========================================
// NAVEGACIÓN Y UI
// ========================================

class NavigationManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        // Event listeners para navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);
            });
        });

        // Cargar página inicial
        this.navigateTo('dashboard');
    }

    navigateTo(pageName) {
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Mostrar página seleccionada
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Actualizar navegación activa
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-page="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentPage = pageName;

        // Cerrar menú móvil en navegación
        closeMobileMenuOnNavigation();

        // Cargar datos de la página
        this.loadPageData(pageName);
    }

    loadPageData(pageName) {
        switch (pageName) {
            case 'dashboard':
                DashboardManager.updateStats();
                break;
            case 'productos':
                ProductManager.renderTable();
                break;
            case 'insumos':
                InsumoManager.renderTable();
                ConsumoManager.loadFilters();
                ConsumoManager.renderConsumoHistory();
                ConsumoManager.updateConsumoStats();
                break;
            case 'calculo':
                CostCalculator.loadMaterials();
                CostCalculator.loadConfig();
                break;
            case 'pedidos':
                PedidoManager.renderTable();
                break;
            case 'facturacion':
                FacturacionManager.renderFacturas();
                break;
            case 'configuracion':
                ConfigManager.loadConfig();
                break;
            case 'clientes':
                if (clienteManager) clienteManager.renderClientes();
                break;
            case 'cotizaciones':
                if (cotizacionManager) cotizacionManager.renderCotizaciones();
                break;
            case 'proveedores':
                if (proveedorManager) {
                    proveedorManager.renderProveedores();
                    proveedorManager.renderCompras();
                }
                break;
            case 'equipos':
                if (equipoManager) {
                    equipoManager.renderEquipos();
                    equipoManager.renderMantenimientos();
                }
                break;
            case 'reportes':
                if (reportesManager) reportesManager.actualizarReportes();
                break;
            case 'finanzas':
                if (finanzasManager) {
                    finanzasManager.renderMovimientos();
                    finanzasManager.updateFinanzasStats();
                }
                break;
        }
    }
}

// ========================================
// DASHBOARD
// ========================================

class DashboardManager {
    static updateStats() {
        const productos = DataManager.load(DataManager.keys.productos);
        const insumos = DataManager.load(DataManager.keys.insumos);
        const pedidos = DataManager.load(DataManager.keys.pedidos);

        // Actualizar estadísticas
        document.getElementById('total-productos').textContent = productos.length;
        document.getElementById('total-insumos').textContent = insumos.length;
        
        const pedidosActivos = pedidos.filter(p => p.estado !== 'Entregado').length;
        document.getElementById('pedidos-activos').textContent = pedidosActivos;

        // Calcular ganancia estimada
        const gananciaPedidos = pedidos
            .filter(p => p.estado === 'Entregado')
            .reduce((sum, p) => sum + (p.precio || 0), 0);
        
        const gananciaProductos = productos.reduce((sum, p) => sum + (p.precio * p.stock || 0), 0);
        
        const gananciaTotal = gananciaPedidos + gananciaProductos;
        document.getElementById('ganancia-estimada').textContent = `₡${gananciaTotal.toLocaleString()}`;

        // Actividad reciente (últimos 5 items)
        this.updateRecentActivity();
    }

    static updateRecentActivity() {
        const recentList = document.getElementById('recent-list');
        const productos = DataManager.load(DataManager.keys.productos);
        const pedidos = DataManager.load(DataManager.keys.pedidos);
        const facturas = DataManager.load(DataManager.keys.facturas);

        let activities = [];

        // Agregar productos recientes
        productos.slice(-3).forEach(producto => {
            activities.push({
                text: `Producto agregado: ${producto.nombre}`,
                time: new Date().toLocaleDateString()
            });
        });

        // Agregar pedidos recientes
        pedidos.slice(-3).forEach(pedido => {
            activities.push({
                text: `Pedido de ${pedido.cliente}: ${pedido.descripcion}`,
                time: pedido.fecha || new Date().toLocaleDateString()
            });
        });

        if (activities.length === 0) {
            recentList.innerHTML = '<p>No hay actividad reciente</p>';
            return;
        }

        recentList.innerHTML = activities.map(activity => `
            <div class="activity-item" style="padding: 0.5rem 0; border-bottom: 1px solid #4d4d4d;">
                <p style="margin: 0; color: var(--text-primary);">${activity.text}</p>
                <small style="color: var(--text-muted);">${activity.time}</small>
            </div>
        `).join('');
    }
}

// ========================================
// GESTIÓN DE PRODUCTOS
// ========================================

class ProductManager {
    static renderTable() {
        const tbody = document.getElementById('productos-tbody');
        const productos = DataManager.load(DataManager.keys.productos);

        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay productos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = productos.map(producto => `
            <tr>
                <td data-label="Nombre"><strong>${producto.nombre}</strong></td>
                <td data-label="Descripción">${producto.descripcion || 'Sin descripción'}</td>
                <td data-label="Categoría"><span class="status-badge">${producto.categoria}</span></td>
                <td data-label="Precio">₡${producto.precio.toLocaleString()}</td>
                <td data-label="Stock">${producto.stock}</td>
                <td data-label="Acciones">
                    <button class="btn btn-small btn-secondary" onclick="ProductManager.editProduct(${producto.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-small btn-danger" onclick="ProductManager.deleteProduct(${producto.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    static editProduct(id) {
        const productos = DataManager.load(DataManager.keys.productos);
        const producto = productos.find(p => p.id === id);
        
        if (!producto) return;

        // Llenar el modal con los datos del producto
        document.getElementById('producto-id').value = producto.id;
        document.getElementById('producto-nombre').value = producto.nombre;
        document.getElementById('producto-descripcion').value = producto.descripcion || '';
        document.getElementById('producto-categoria').value = producto.categoria;
        document.getElementById('producto-precio').value = producto.precio;
        document.getElementById('producto-stock').value = producto.stock;

        // Cambiar título del modal
        document.getElementById('producto-modal-title').textContent = 'Editar Producto';

        openProductModal();
    }

    static deleteProduct(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

        let productos = DataManager.load(DataManager.keys.productos);
        productos = productos.filter(p => p.id !== id);
        
        DataManager.save(DataManager.keys.productos, productos);
        this.renderTable();
        DashboardManager.updateStats();
    }

    static saveProduct(formData) {
        let productos = DataManager.load(DataManager.keys.productos);
        const id = formData.get('id');

        const productoData = {
            nombre: formData.get('nombre'),
            descripcion: formData.get('descripcion'),
            categoria: formData.get('categoria'),
            precio: parseFloat(formData.get('precio')),
            stock: parseInt(formData.get('stock'))
        };

        if (id) {
            // Editar producto existente
            const index = productos.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
                productos[index] = { ...productos[index], ...productoData };
            }
        } else {
            // Crear nuevo producto
            const newId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
            productos.push({ id: newId, ...productoData });
        }

        DataManager.save(DataManager.keys.productos, productos);
        this.renderTable();
        DashboardManager.updateStats();
        closeModal();
    }
}

// ========================================
// GESTIÓN DE INSUMOS
// ========================================

class InsumoManager {
    static renderTable() {
        const tbody = document.getElementById('insumos-tbody');
        const insumos = DataManager.load(DataManager.keys.insumos);

        if (insumos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay materiales registrados</td></tr>';
            return;
        }

        tbody.innerHTML = insumos.map(insumo => {
            // Validar y convertir valores
            const peso = parseFloat(insumo.peso) || 0;
            const costo = parseFloat(insumo.costo) || 0;
            const valorTotal = peso * costo;
            
            // Determinar estado del stock
            let stockStatus = 'stock-alto';
            let stockText = 'Stock Alto';
            
            if (peso === 0) {
                stockStatus = 'stock-agotado';
                stockText = 'Agotado';
            } else if (peso < 0.2) {
                stockStatus = 'stock-bajo';
                stockText = 'Stock Bajo';
            } else if (peso < 0.5) {
                stockStatus = 'stock-medio';
                stockText = 'Stock Medio';
            }
            
            return `
                <tr>
                    <td data-label="Material"><strong>${insumo.tipo || 'Sin tipo'}</strong></td>
                    <td data-label="Color">${insumo.color || 'Sin color'}</td>
                    <td data-label="Peso Disponible">${peso} kg</td>
                    <td data-label="Costo/kg">₡${costo.toLocaleString()}</td>
                    <td data-label="Valor Total">₡${valorTotal.toLocaleString()}</td>
                    <td data-label="Estado"><span class="stock-status ${stockStatus}">${stockText}</span></td>
                    <td data-label="Acciones">
                        <button class="btn btn-small btn-secondary" onclick="InsumoManager.editInsumo(${insumo.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-small btn-danger" onclick="InsumoManager.deleteInsumo(${insumo.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    static editInsumo(id) {
        const insumos = DataManager.load(DataManager.keys.insumos);
        const insumo = insumos.find(i => i.id === id);
        
        if (!insumo) return;

        document.getElementById('insumo-id').value = insumo.id;
        document.getElementById('insumo-tipo').value = insumo.tipo;
        document.getElementById('insumo-color').value = insumo.color;
        document.getElementById('insumo-peso').value = insumo.peso;
        document.getElementById('insumo-costo').value = insumo.costo;

        document.getElementById('insumo-modal-title').textContent = 'Editar Material';
        openInsumoModal();
    }

    static deleteInsumo(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este material?')) return;

        let insumos = DataManager.load(DataManager.keys.insumos);
        insumos = insumos.filter(i => i.id !== id);
        
        DataManager.save(DataManager.keys.insumos, insumos);
        this.renderTable();
        DashboardManager.updateStats();
    }

    static saveInsumo(formData) {
        let insumos = DataManager.load(DataManager.keys.insumos);
        const id = formData.get('id');

        const insumoData = {
            tipo: formData.get('tipo') || 'Sin tipo',
            color: formData.get('color') || 'Sin color',
            peso: parseFloat(formData.get('peso')) || 0,
            costo: parseFloat(formData.get('costo')) || 0
        };

        if (id) {
            const index = insumos.findIndex(i => i.id === parseInt(id));
            if (index !== -1) {
                insumos[index] = { ...insumos[index], ...insumoData };
            }
        } else {
            const newId = insumos.length > 0 ? Math.max(...insumos.map(i => i.id)) + 1 : 1;
            insumos.push({ id: newId, ...insumoData });
        }

        DataManager.save(DataManager.keys.insumos, insumos);
        this.renderTable();
        DashboardManager.updateStats();
        closeModal();
    }
}

// ========================================
// GESTIÓN DE CONSUMO DE INSUMOS
// ========================================

class ConsumoManager {
    static renderConsumoHistory() {
        const container = document.getElementById('consumo-list');
        const consumos = DataManager.load('consumos');
        const filtroMaterial = document.getElementById('filtro-material-consumo').value;
        const filtroPeriodo = document.getElementById('filtro-periodo').value;

        let consumosFiltrados = consumos;

        // Filtrar por material
        if (filtroMaterial) {
            consumosFiltrados = consumosFiltrados.filter(c => c.materialId === parseInt(filtroMaterial));
        }

        // Filtrar por período
        if (filtroPeriodo !== 'all') {
            const diasAtras = parseInt(filtroPeriodo);
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - diasAtras);
            
            consumosFiltrados = consumosFiltrados.filter(c => {
                const fechaConsumo = new Date(c.fecha);
                return fechaConsumo >= fechaLimite;
            });
        }

        // Ordenar por fecha descendente
        consumosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        if (consumosFiltrados.length === 0) {
            container.innerHTML = '<p>No hay registros de consumo para los filtros seleccionados</p>';
            return;
        }

        const insumos = DataManager.load(DataManager.keys.insumos);
        const pedidos = DataManager.load(DataManager.keys.pedidos);

        container.innerHTML = consumosFiltrados.map(consumo => {
            const material = insumos.find(i => i.id === consumo.materialId);
            const pedido = consumo.pedidoId ? pedidos.find(p => p.id === consumo.pedidoId) : null;
            const fecha = new Date(consumo.fecha).toLocaleDateString();
            const hora = new Date(consumo.fecha).toLocaleTimeString();

            return `
                <div class="consumo-item">
                    <div class="consumo-item-header">
                        <span class="consumo-material">${material ? `${material.tipo} - ${material.color}` : 'Material eliminado'}</span>
                        <span class="consumo-fecha">${fecha} ${hora}</span>
                    </div>
                    <div class="consumo-details">
                        <div class="consumo-detail">
                            <strong>Cantidad:</strong> ${consumo.cantidad}g
                        </div>
                        <div class="consumo-detail">
                            <strong>Motivo:</strong> ${consumo.motivo}
                        </div>
                        <div class="consumo-detail">
                            <strong>Costo:</strong> ₡${(consumo.costo || 0).toLocaleString()}
                        </div>
                        ${pedido ? `
                        <div class="consumo-detail">
                            <strong>Pedido:</strong> ${pedido.cliente}
                        </div>
                        ` : ''}
                    </div>
                    ${consumo.descripcion ? `
                    <div class="consumo-descripcion" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">
                        ${consumo.descripcion}
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    static loadFilters() {
        // Cargar materiales en filtro
        const filtroMaterial = document.getElementById('filtro-material-consumo');
        const insumos = DataManager.load(DataManager.keys.insumos);

        filtroMaterial.innerHTML = '<option value="">Todos los materiales</option>';
        insumos.forEach(insumo => {
            const option = document.createElement('option');
            option.value = insumo.id;
            option.textContent = `${insumo.tipo} - ${insumo.color}`;
            filtroMaterial.appendChild(option);
        });

        // Cargar materiales en modal de consumo
        const consumoSelect = document.getElementById('consumo-material');
        consumoSelect.innerHTML = '<option value="">Seleccionar material...</option>';
        insumos.forEach(insumo => {
            const option = document.createElement('option');
            option.value = insumo.id;
            option.textContent = `${insumo.tipo} - ${insumo.color} (${insumo.peso}kg disponibles)`;
            option.dataset.costo = insumo.costo;
            option.dataset.disponible = insumo.peso;
            consumoSelect.appendChild(option);
        });

        // Cargar pedidos en modal de consumo
        const pedidoSelect = document.getElementById('consumo-pedido');
        const pedidos = DataManager.load(DataManager.keys.pedidos);
        
        pedidoSelect.innerHTML = '<option value="">Sin pedido asociado</option>';
        pedidos.filter(p => p.estado !== 'Entregado').forEach(pedido => {
            const option = document.createElement('option');
            option.value = pedido.id;
            option.textContent = `${pedido.cliente} - ${pedido.descripcion}`;
            pedidoSelect.appendChild(option);
        });
    }

    static saveConsumo(formData) {
        const materialId = parseInt(formData.get('materialId'));
        const cantidad = parseFloat(formData.get('cantidad')); // en gramos
        const motivo = formData.get('motivo');
        const descripcion = formData.get('descripcion');
        const pedidoId = formData.get('pedidoId') ? parseInt(formData.get('pedidoId')) : null;

        // Verificar que hay suficiente material
        const insumos = DataManager.load(DataManager.keys.insumos);
        const material = insumos.find(i => i.id === materialId);
        
        if (!material) {
            alert('Material no encontrado');
            return;
        }

        const cantidadKg = cantidad / 1000;
        if (cantidadKg > material.peso) {
            alert(`No hay suficiente material. Disponible: ${material.peso}kg, Solicitado: ${cantidadKg}kg`);
            return;
        }

        // Calcular costo del consumo
        const costo = cantidadKg * material.costo;

        // Crear registro de consumo
        const consumos = DataManager.load('consumos');
        const newId = consumos.length > 0 ? Math.max(...consumos.map(c => c.id)) + 1 : 1;
        
        const consumo = {
            id: newId,
            materialId,
            cantidad,
            motivo,
            descripcion,
            pedidoId,
            costo,
            fecha: new Date().toISOString()
        };

        consumos.push(consumo);
        DataManager.save('consumos', consumos);

        // Actualizar stock del material
        material.peso = Math.max(0, material.peso - cantidadKg);
        DataManager.save(DataManager.keys.insumos, insumos);

        // Actualizar vistas
        InsumoManager.renderTable();
        this.renderConsumoHistory();
        this.updateConsumoStats();
        DashboardManager.updateStats();
        
        closeModal();
        alert(`Consumo registrado: ${cantidad}g de ${material.tipo} - ${material.color}`);
    }

    static updateConsumoStats() {
        const consumos = DataManager.load('consumos');
        const insumos = DataManager.load(DataManager.keys.insumos);
        
        // Consumo del mes actual
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        
        const consumosMes = consumos.filter(c => new Date(c.fecha) >= inicioMes);
        const consumoTotalMes = consumosMes.reduce((sum, c) => sum + c.cantidad, 0) / 1000; // en kg
        const costoConsumoMes = consumosMes.reduce((sum, c) => sum + (c.costo || 0), 0);
        
        // Materiales con stock bajo (menos de 0.5kg)
        const materialesBajos = insumos.filter(i => i.peso < 0.5).length;
        
        document.getElementById('consumo-mes').textContent = `${consumoTotalMes.toFixed(2)} kg`;
        document.getElementById('materiales-bajos').textContent = materialesBajos;
        document.getElementById('costo-consumo-mes').textContent = `₡${costoConsumoMes.toLocaleString()}`;
    }
}

// ========================================
// CALCULADORA DE COSTOS
// ========================================

class CostCalculator {
    static loadMaterials() {
        const select = document.getElementById('calc-material');
        const insumos = DataManager.load(DataManager.keys.insumos);

        select.innerHTML = '<option value="">Seleccionar material...</option>';
        
        insumos.forEach(insumo => {
            const option = document.createElement('option');
            option.value = insumo.id;
            option.textContent = `${insumo.tipo} - ${insumo.color} (₡${insumo.costo}/kg)`;
            option.dataset.costo = insumo.costo;
            select.appendChild(option);
        });

        // También cargar en el modal de pedidos
        const pedidoSelect = document.getElementById('pedido-material');
        if (pedidoSelect) {
            pedidoSelect.innerHTML = '<option value="">Seleccionar material...</option>';
            insumos.forEach(insumo => {
                const option = document.createElement('option');
                option.value = insumo.id;
                option.textContent = `${insumo.tipo} - ${insumo.color}`;
                pedidoSelect.appendChild(option);
            });
        }
    }

    static loadConfig() {
        const config = DataManager.getConfig();
        document.getElementById('calc-costo-hora').value = config.costoHora;
        document.getElementById('calc-margen').value = config.margen;
    }

    static calculate(formData) {
        const materialId = parseInt(formData.get('material'));
        const peso = parseFloat(formData.get('peso')); // gramos
        const tiempo = parseFloat(formData.get('tiempo')); // horas
        const costoHora = parseFloat(formData.get('costo-hora'));
        const margen = parseFloat(formData.get('margen'));

        // Obtener costo del material
        const insumos = DataManager.load(DataManager.keys.insumos);
        const material = insumos.find(i => i.id === materialId);
        
        if (!material) {
            alert('Material no encontrado');
            return;
        }

        // Cálculos
        const pesoKg = peso / 1000; // convertir a kg
        const costoMaterial = pesoKg * material.costo;
        const costoImpresion = tiempo * costoHora;
        const subtotal = costoMaterial + costoImpresion;
        const precioFinal = subtotal * (1 + margen / 100);

        // Mostrar resultados
        document.getElementById('costo-material').textContent = `₡${costoMaterial.toLocaleString()}`;
        document.getElementById('costo-impresion').textContent = `₡${costoImpresion.toLocaleString()}`;
        document.getElementById('subtotal').textContent = `₡${subtotal.toLocaleString()}`;
        document.getElementById('precio-final').textContent = `₡${precioFinal.toLocaleString()}`;

        // Guardar datos para usar después
        this.lastCalculation = {
            material: material.tipo + ' - ' + material.color,
            peso,
            tiempo,
            costoMaterial,
            costoImpresion,
            subtotal,
            precioFinal
        };

        document.getElementById('calc-results').style.display = 'block';
    }
}

// ========================================
// GESTIÓN DE PEDIDOS
// ========================================

class PedidoManager {
    static renderTable() {
        const tbody = document.getElementById('pedidos-tbody');
        const pedidos = DataManager.load(DataManager.keys.pedidos);

        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay pedidos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = pedidos.map(pedido => `
            <tr>
                <td data-label="Cliente"><strong>${pedido.cliente}</strong></td>
                <td data-label="Descripción">${pedido.descripcion}</td>
                <td data-label="Material">${pedido.material || 'Sin especificar'}</td>
                <td data-label="Precio">₡${pedido.precio.toLocaleString()}</td>
                <td data-label="Estado"><span class="status-badge status-${pedido.estado.toLowerCase().replace(' ', '')}">${pedido.estado}</span></td>
                <td data-label="Fecha">${pedido.fecha || new Date().toLocaleDateString()}</td>
                <td data-label="Acciones">
                    <button class="btn btn-small btn-primary" onclick="PedidoManager.generateInvoice(${pedido.id})" title="Generar factura">
                        <i class="fas fa-receipt"></i> Factura
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="PedidoManager.editPedido(${pedido.id})" title="Editar pedido">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-small btn-danger" onclick="PedidoManager.deletePedido(${pedido.id})" title="Eliminar pedido">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    static editPedido(id) {
        const pedidos = DataManager.load(DataManager.keys.pedidos);
        const pedido = pedidos.find(p => p.id === id);
        
        if (!pedido) return;

        document.getElementById('pedido-id').value = pedido.id;
        document.getElementById('pedido-cliente').value = pedido.cliente;
        document.getElementById('pedido-descripcion').value = pedido.descripcion;
        document.getElementById('pedido-peso').value = pedido.peso || '';
        document.getElementById('pedido-precio').value = pedido.precio;
        document.getElementById('pedido-estado').value = pedido.estado;

        document.getElementById('pedido-modal-title').textContent = 'Editar Pedido';
        openPedidoModal();
    }

    static deletePedido(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este pedido?')) return;

        let pedidos = DataManager.load(DataManager.keys.pedidos);
        pedidos = pedidos.filter(p => p.id !== id);
        
        DataManager.save(DataManager.keys.pedidos, pedidos);
        this.renderTable();
        DashboardManager.updateStats();
    }

    static savePedido(formData) {
        let pedidos = DataManager.load(DataManager.keys.pedidos);
        const id = formData.get('id');

        // Obtener nombre del material seleccionado
        const materialId = formData.get('material');
        const insumos = DataManager.load(DataManager.keys.insumos);
        const material = insumos.find(i => i.id === parseInt(materialId));

        const pedidoData = {
            cliente: formData.get('cliente'),
            descripcion: formData.get('descripcion'),
            materialId: materialId,
            material: material ? `${material.tipo} - ${material.color}` : '',
            peso: parseFloat(formData.get('peso')) || 0,
            precio: parseFloat(formData.get('precio')),
            estado: formData.get('estado'),
            fecha: new Date().toLocaleDateString()
        };

        let pedidoId;
        if (id) {
            const index = pedidos.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
                pedidos[index] = { ...pedidos[index], ...pedidoData };
                pedidoId = parseInt(id);
            }
        } else {
            const newId = pedidos.length > 0 ? Math.max(...pedidos.map(p => p.id)) + 1 : 1;
            pedidos.push({ id: newId, ...pedidoData });
            pedidoId = newId;
        }

        DataManager.save(DataManager.keys.pedidos, pedidos);

        // Si es un pedido nuevo con material y peso, preguntar si desea registrar el consumo
        if (!id && material && pedidoData.peso > 0 && pedidoData.estado === 'En impresión') {
            const registrarConsumo = confirm(
                `¿Desea registrar automáticamente el consumo de ${pedidoData.peso}g de ${material.tipo} - ${material.color} para este pedido?`
            );
            
            if (registrarConsumo) {
                // Verificar que hay suficiente material
                const cantidadKg = pedidoData.peso / 1000;
                if (cantidadKg <= material.peso) {
                    // Crear registro de consumo automático
                    const consumos = DataManager.load('consumos');
                    const consumoId = consumos.length > 0 ? Math.max(...consumos.map(c => c.id)) + 1 : 1;
                    
                    const consumo = {
                        id: consumoId,
                        materialId: parseInt(materialId),
                        cantidad: pedidoData.peso,
                        motivo: 'Impresión',
                        descripcion: `Consumo automático para pedido de ${pedidoData.cliente}`,
                        pedidoId: pedidoId,
                        costo: cantidadKg * material.costo,
                        fecha: new Date().toISOString()
                    };

                    consumos.push(consumo);
                    DataManager.save('consumos', consumos);

                    // Actualizar stock del material
                    material.peso = Math.max(0, material.peso - cantidadKg);
                    DataManager.save(DataManager.keys.insumos, insumos);
                } else {
                    alert(`Advertencia: No hay suficiente material (${material.peso}kg disponibles, ${cantidadKg}kg requeridos). El consumo debe registrarse manualmente.`);
                }
            }
        }

        this.renderTable();
        DashboardManager.updateStats();
        closeModal();
    }

    static generateInvoice(pedidoId) {
        const pedidos = DataManager.load(DataManager.keys.pedidos);
        const pedido = pedidos.find(p => p.id === pedidoId);
        
        if (!pedido) return;

        // Crear factura basada en el pedido
        const facturaData = {
            cliente: pedido.cliente,
            telefono: '',
            items: [{
                descripcion: pedido.descripcion,
                cantidad: 1,
                precio: pedido.precio
            }]
        };

        FacturacionManager.createFactura(facturaData);
    }
}

// ========================================
// FACTURACIÓN
// ========================================

class FacturacionManager {
    static renderFacturas() {
        const container = document.getElementById('facturas-list');
        const facturas = DataManager.load(DataManager.keys.facturas);

        if (facturas.length === 0) {
            container.innerHTML = '<p>No hay facturas registradas</p>';
            return;
        }

        container.innerHTML = facturas.map(factura => `
            <div class="factura-card">
                <h4>Factura #${factura.numero}</h4>
                <p><strong>Cliente:</strong> ${factura.cliente}</p>
                <p><strong>Fecha:</strong> ${factura.fecha}</p>
                <p><strong>Total:</strong> ₡${factura.total.toLocaleString()}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-small btn-primary" onclick="FacturacionManager.viewFactura(${factura.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="FacturacionManager.printFactura(${factura.id})">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                </div>
            </div>
        `).join('');
    }

    static createFactura(data) {
        const config = DataManager.getConfig();
        let facturas = DataManager.load(DataManager.keys.facturas);
        
        const numero = facturas.length > 0 ? Math.max(...facturas.map(f => f.numero)) + 1 : 1;
        const subtotal = data.items.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
        const iva = subtotal * (config.iva / 100);
        const total = subtotal + iva;

        const factura = {
            id: facturas.length > 0 ? Math.max(...facturas.map(f => f.id)) + 1 : 1,
            numero,
            cliente: data.cliente,
            telefono: data.telefono || '',
            items: data.items,
            subtotal,
            iva,
            total,
            fecha: new Date().toLocaleDateString(),
            hora: new Date().toLocaleTimeString()
        };

        facturas.push(factura);
        DataManager.save(DataManager.keys.facturas, facturas);
        
        this.renderFacturas();
        this.showFacturaPreview(factura);
        
        return factura;
    }

    static showFacturaPreview(factura) {
        const config = DataManager.getConfig();
        const content = document.getElementById('factura-preview-content');
        
        content.innerHTML = `
            <div class="factura-preview">
                <div class="factura-header">
                    <h2>${config.nombreNegocio}</h2>
                    ${config.telefono ? `<p>Tel: ${config.telefono}</p>` : ''}
                    ${config.direccion ? `<p>${config.direccion}</p>` : ''}
                    <p>=============================</p>
                </div>
                
                <div class="factura-info">
                    <p><strong>Factura #:</strong> ${factura.numero}</p>
                    <p><strong>Cliente:</strong> ${factura.cliente}</p>
                    ${factura.telefono ? `<p><strong>Tel:</strong> ${factura.telefono}</p>` : ''}
                    <p><strong>Fecha:</strong> ${factura.fecha}</p>
                    <p><strong>Hora:</strong> ${factura.hora}</p>
                    <p>=============================</p>
                </div>
                
                <div class="factura-items-list">
                    <p><strong>PRODUCTOS/SERVICIOS:</strong></p>
                    ${factura.items.map(item => `
                        <div class="factura-item-line">
                            <span>${item.descripcion}</span>
                        </div>
                        <div class="factura-item-line">
                            <span> ${item.cantidad} x ₡${item.precio.toLocaleString()}</span>
                            <span>₡${(item.cantidad * item.precio).toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="factura-totals">
                    <div class="factura-total-line">
                        <span>Subtotal:</span>
                        <span>₡${factura.subtotal.toLocaleString()}</span>
                    </div>
                    <div class="factura-total-line">
                        <span>IVA (${DataManager.getConfig().iva}%):</span>
                        <span>₡${factura.iva.toLocaleString()}</span>
                    </div>
                    <div class="factura-total-line" style="font-weight: bold; border-top: 2px solid #000; padding-top: 0.5rem;">
                        <span>TOTAL:</span>
                        <span>₡${factura.total.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="factura-footer">
                    <p>¡Gracias por su compra!</p>
                    <p>Vuelva pronto</p>
                </div>
            </div>
        `;

        // Mostrar modal de vista previa
        showModal('factura-preview-modal');
        
        // Guardar la factura actual para imprimir
        this.currentFactura = factura;
    }

    static viewFactura(id) {
        const facturas = DataManager.load(DataManager.keys.facturas);
        const factura = facturas.find(f => f.id === id);
        if (factura) {
            this.showFacturaPreview(factura);
        }
    }

    static printFactura(id = null) {
        let factura;
        if (id) {
            const facturas = DataManager.load(DataManager.keys.facturas);
            factura = facturas.find(f => f.id === id);
        } else {
            factura = this.currentFactura;
        }

        if (!factura) return;

        // Crear contenido para imprimir
        const printContent = document.getElementById('factura-preview-content').innerHTML;
        
        // Abrir ventana de impresión
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Factura #${factura.numero}</title>
                <style>
                    body { 
                        font-family: 'Courier New', monospace; 
                        font-size: 12px; 
                        line-height: 1.2; 
                        margin: 0; 
                        padding: 10px;
                        width: 58mm;
                    }
                    .factura-preview { 
                        background: white; 
                        color: black; 
                        max-width: 100%;
                    }
                    .factura-item-line { 
                        display: flex; 
                        justify-content: space-between; 
                        margin-bottom: 2px; 
                    }
                    .factura-total-line { 
                        display: flex; 
                        justify-content: space-between; 
                        margin-bottom: 2px; 
                    }
                    .factura-header, .factura-footer { 
                        text-align: center; 
                    }
                    @media print {
                        body { margin: 0; }
                        .factura-preview { 
                            width: 58mm; 
                            font-size: 10px; 
                        }
                    }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    }
}

// ========================================
// CONFIGURACIÓN
// ========================================

class ConfigManager {
    static loadConfig() {
        const config = DataManager.getConfig();
        
        document.getElementById('config-nombre').value = config.nombreNegocio;
        document.getElementById('config-telefono').value = config.telefono;
        document.getElementById('config-direccion').value = config.direccion;
        document.getElementById('config-costo-hora').value = config.costoHora;
        document.getElementById('config-margen').value = config.margen;
        document.getElementById('config-iva').value = config.iva;
    }

    static saveConfig(formData) {
        const config = {
            nombreNegocio: formData.get('nombre') || '3D Control Center',
            telefono: formData.get('telefono') || '',
            direccion: formData.get('direccion') || '',
            costoHora: parseFloat(formData.get('costo-hora')) || 1000,
            margen: parseFloat(formData.get('margen')) || 30,
            iva: parseFloat(formData.get('iva')) || 13
        };

        DataManager.saveConfig(config);
        alert('Configuración guardada correctamente');
    }
}

// ========================================
// GESTIÓN DE MENÚ MÓVIL
// ========================================

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
    
    // Cambiar icono
    const icon = menuToggle.querySelector('i');
    if (sidebar.classList.contains('mobile-open')) {
        icon.className = 'fas fa-times';
    } else {
        icon.className = 'fas fa-bars';
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    
    // Restaurar icono
    const icon = menuToggle.querySelector('i');
    icon.className = 'fas fa-bars';
}

// Cerrar menú móvil al cambiar de página
function closeMobileMenuOnNavigation() {
    if (window.innerWidth <= 1023) {
        closeMobileMenu();
    }
}

// ========================================
// GESTIÓN DE MODALES
// ========================================

function showModal(modalId) {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById(modalId).classList.add('active');
    
    // Cerrar menú móvil si está abierto
    closeMobileMenu();
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    // Limpiar formularios
    document.querySelectorAll('.modal-form').forEach(form => {
        form.reset();
        // Limpiar campos hidden
        form.querySelectorAll('input[type="hidden"]').forEach(input => {
            input.value = '';
        });
    });
}

// Funciones globales para abrir modales
function openProductModal() {
    document.getElementById('producto-modal-title').textContent = 'Agregar Producto';
    showModal('producto-modal');
}

function openInsumoModal() {
    document.getElementById('insumo-modal-title').textContent = 'Agregar Material';
    showModal('insumo-modal');
}

function openPedidoModal() {
    document.getElementById('pedido-modal-title').textContent = 'Nuevo Pedido';
    CostCalculator.loadMaterials(); // Cargar materiales disponibles
    showModal('pedido-modal');
}

function openFacturaModal() {
    showModal('factura-modal');
}

function openConsumoModal() {
    ConsumoManager.loadFilters();
    showModal('consumo-modal');
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function saveAsProduct() {
    if (!CostCalculator.lastCalculation) return;
    
    const calc = CostCalculator.lastCalculation;
    
    // Llenar modal de producto con datos calculados
    document.getElementById('producto-nombre').value = `Pieza ${calc.material}`;
    document.getElementById('producto-descripcion').value = `Impresión 3D - ${calc.peso}g - ${calc.tiempo}h`;
    document.getElementById('producto-categoria').value = 'Personalizado';
    document.getElementById('producto-precio').value = Math.round(calc.precioFinal);
    document.getElementById('producto-stock').value = 1;
    
    openProductModal();
}

function createOrder() {
    if (!CostCalculator.lastCalculation) return;
    
    const calc = CostCalculator.lastCalculation;
    
    // Llenar modal de pedido con datos calculados
    document.getElementById('pedido-descripcion').value = `Impresión 3D - ${calc.peso}g - ${calc.tiempo}h`;
    document.getElementById('pedido-peso').value = calc.peso;
    document.getElementById('pedido-precio').value = Math.round(calc.precioFinal);
    document.getElementById('pedido-estado').value = 'Pendiente';
    
    openPedidoModal();
}

function addFacturaItem() {
    const container = document.getElementById('factura-items-container');
    const newItem = document.createElement('div');
    newItem.className = 'factura-item';
    newItem.innerHTML = `
        <input type="text" placeholder="Descripción del producto/servicio" class="item-descripcion" required>
        <input type="number" placeholder="Cantidad" class="item-cantidad" min="1" value="1" required>
        <input type="number" placeholder="Precio unitario" class="item-precio" min="0" step="100" required>
        <button type="button" class="btn btn-danger btn-small" onclick="removeFacturaItem(this)">×</button>
    `;
    container.appendChild(newItem);
}

function removeFacturaItem(button) {
    const container = document.getElementById('factura-items-container');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

function resetData() {
    if (confirm('¿Estás seguro de que quieres eliminar todos los datos? Esta acción no se puede deshacer.')) {
        DataManager.reset();
    }
}

function printFactura() {
    FacturacionManager.printFactura();
}

// ========================================
// NUEVOS MANAGERS PARA MÓDULOS ADICIONALES
// ========================================

class ClienteManager {
    constructor() {
        this.clientes = DataManager.load(DataManager.keys.clientes);
        this.initEventListeners();
    }

    initEventListeners() {
        const form = document.getElementById('cliente-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const cliente = Object.fromEntries(formData.entries());
        
        cliente.id = Date.now().toString();
        cliente.fechaRegistro = new Date().toISOString().split('T')[0];
        cliente.pedidos = 0;
        cliente.totalGastado = 0;
        cliente.ultimoPedido = null;
        cliente.activo = true;

        this.clientes.push(cliente);
        DataManager.save(DataManager.keys.clientes, this.clientes);
        this.renderClientes();
        closeModal();
        e.target.reset();
    }

    renderClientes() {
        const tbody = document.getElementById('clientes-tbody');
        if (!tbody) return;

        if (this.clientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay clientes registrados</td></tr>';
            return;
        }

        tbody.innerHTML = this.clientes.map(cliente => `
            <tr>
                <td>${cliente.nombre}</td>
                <td>${cliente.email}</td>
                <td>${cliente.telefono}</td>
                <td>${cliente.pedidos}</td>
                <td>₡${cliente.totalGastado.toLocaleString()}</td>
                <td>${cliente.ultimoPedido || 'Sin pedidos'}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="editCliente('${cliente.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteCliente('${cliente.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        this.updateStats();
    }

    updateStats() {
        const totalElement = document.getElementById('total-clientes');
        const activosElement = document.getElementById('clientes-activos');
        const promedioElement = document.getElementById('valor-promedio-cliente');

        if (totalElement) totalElement.textContent = this.clientes.length;
        if (activosElement) activosElement.textContent = this.clientes.filter(c => c.activo).length;
        
        const promedio = this.clientes.length > 0 ? 
            this.clientes.reduce((sum, c) => sum + c.totalGastado, 0) / this.clientes.length : 0;
        if (promedioElement) promedioElement.textContent = `₡${promedio.toLocaleString()}`;
    }
}

class CotizacionManager {
    constructor() {
        this.cotizaciones = DataManager.load(DataManager.keys.cotizaciones);
        this.initEventListeners();
    }

    initEventListeners() {
        const form = document.getElementById('cotizacion-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const cotizacion = Object.fromEntries(formData.entries());
        
        // Procesar items de cotización
        const items = this.getItemsFromForm(e.target);
        const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
        
        cotizacion.id = Date.now().toString();
        cotizacion.numero = `COT-${Date.now()}`;
        cotizacion.fecha = new Date().toISOString().split('T')[0];
        cotizacion.items = items;
        cotizacion.total = total;
        cotizacion.estado = 'Borrador';
        
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + parseInt(cotizacion.validez));
        cotizacion.fechaVencimiento = fechaVencimiento.toISOString().split('T')[0];

        this.cotizaciones.push(cotizacion);
        DataManager.save(DataManager.keys.cotizaciones, this.cotizaciones);
        this.renderCotizaciones();
        closeModal();
        e.target.reset();
    }

    getItemsFromForm(form) {
        const items = [];
        const descriptions = form.querySelectorAll('input[name="item-descripcion"]');
        const cantidades = form.querySelectorAll('input[name="item-cantidad"]');
        const precios = form.querySelectorAll('input[name="item-precio"]');

        for (let i = 0; i < descriptions.length; i++) {
            if (descriptions[i].value.trim()) {
                items.push({
                    descripcion: descriptions[i].value,
                    cantidad: parseInt(cantidades[i].value) || 1,
                    precio: parseFloat(precios[i].value) || 0
                });
            }
        }
        return items;
    }

    renderCotizaciones() {
        const tbody = document.getElementById('cotizaciones-tbody');
        if (!tbody) return;

        if (this.cotizaciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay cotizaciones registradas</td></tr>';
            return;
        }

        tbody.innerHTML = this.cotizaciones.map(cotizacion => `
            <tr>
                <td>${cotizacion.numero}</td>
                <td>${cotizacion.cliente}</td>
                <td>${cotizacion.descripcion}</td>
                <td>₡${cotizacion.total.toLocaleString()}</td>
                <td><span class="status-badge status-${cotizacion.estado.toLowerCase()}">${cotizacion.estado}</span></td>
                <td>${cotizacion.fecha}</td>
                <td>${cotizacion.fechaVencimiento}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="editCotizacion('${cotizacion.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-success" onclick="convertirAPedido('${cotizacion.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

class ProveedorManager {
    constructor() {
        this.proveedores = DataManager.load(DataManager.keys.proveedores);
        this.compras = DataManager.load(DataManager.keys.compras);
        this.initEventListeners();
    }

    initEventListeners() {
        const proveedorForm = document.getElementById('proveedor-form');
        const compraForm = document.getElementById('compra-form');
        
        if (proveedorForm) {
            proveedorForm.addEventListener('submit', (e) => this.handleProveedorSubmit(e));
        }
        if (compraForm) {
            compraForm.addEventListener('submit', (e) => this.handleCompraSubmit(e));
        }
    }

    handleProveedorSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const proveedor = Object.fromEntries(formData.entries());
        
        proveedor.id = Date.now().toString();
        proveedor.fechaRegistro = new Date().toISOString().split('T')[0];
        proveedor.compras = 0;
        proveedor.totalGastado = 0;

        this.proveedores.push(proveedor);
        DataManager.save(DataManager.keys.proveedores, this.proveedores);
        this.renderProveedores();
        closeModal();
        e.target.reset();
    }

    handleCompraSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const compra = Object.fromEntries(formData.entries());
        
        compra.id = Date.now().toString();
        compra.costo = parseFloat(compra.costo);
        compra.cantidad = parseInt(compra.cantidad);

        this.compras.push(compra);
        DataManager.save(DataManager.keys.compras, this.compras);
        
        // Actualizar estadísticas del proveedor
        const proveedor = this.proveedores.find(p => p.id === compra.proveedor);
        if (proveedor) {
            proveedor.compras++;
            proveedor.totalGastado += compra.costo;
            DataManager.save(DataManager.keys.proveedores, this.proveedores);
        }

        this.renderProveedores();
        this.renderCompras();
        closeModal();
        e.target.reset();
    }

    renderProveedores() {
        const tbody = document.getElementById('proveedores-tbody');
        if (!tbody) return;

        if (this.proveedores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay proveedores registrados</td></tr>';
            return;
        }

        tbody.innerHTML = this.proveedores.map(proveedor => `
            <tr>
                <td>${proveedor.nombre}</td>
                <td>${proveedor.contacto}</td>
                <td>${proveedor.especialidad}</td>
                <td>${proveedor.compras}</td>
                <td>₡${proveedor.totalGastado.toLocaleString()}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="editProveedor('${proveedor.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderCompras() {
        const tbody = document.getElementById('compras-tbody');
        if (!tbody) return;

        if (this.compras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay compras registradas</td></tr>';
            return;
        }

        tbody.innerHTML = this.compras.map(compra => {
            const proveedor = this.proveedores.find(p => p.id === compra.proveedor);
            return `
                <tr>
                    <td>${compra.fecha}</td>
                    <td>${proveedor ? proveedor.nombre : 'N/A'}</td>
                    <td>${compra.descripcion}</td>
                    <td>${compra.cantidad}</td>
                    <td>₡${compra.costo.toLocaleString()}</td>
                    <td>
                        <button class="btn btn-small btn-secondary" onclick="editCompra('${compra.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

class EquipoManager {
    constructor() {
        this.equipos = DataManager.load(DataManager.keys.equipos);
        this.mantenimientos = DataManager.load(DataManager.keys.mantenimientos);
        this.initEventListeners();
    }

    initEventListeners() {
        const equipoForm = document.getElementById('equipo-form');
        const mantenimientoForm = document.getElementById('mantenimiento-form');
        
        if (equipoForm) {
            equipoForm.addEventListener('submit', (e) => this.handleEquipoSubmit(e));
        }
        if (mantenimientoForm) {
            mantenimientoForm.addEventListener('submit', (e) => this.handleMantenimientoSubmit(e));
        }
    }

    handleEquipoSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const equipo = Object.fromEntries(formData.entries());
        
        equipo.id = Date.now().toString();
        equipo.costo = parseFloat(equipo.costo) || 0;
        equipo.ultimoMantenimiento = null;
        equipo.proximoMantenimiento = null;

        this.equipos.push(equipo);
        DataManager.save(DataManager.keys.equipos, this.equipos);
        this.renderEquipos();
        closeModal();
        e.target.reset();
    }

    handleMantenimientoSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const mantenimiento = Object.fromEntries(formData.entries());
        
        mantenimiento.id = Date.now().toString();
        mantenimiento.costo = parseFloat(mantenimiento.costo) || 0;

        this.mantenimientos.push(mantenimiento);
        DataManager.save(DataManager.keys.mantenimientos, this.mantenimientos);
        
        // Actualizar fecha de último mantenimiento del equipo
        const equipo = this.equipos.find(e => e.id === mantenimiento.equipo);
        if (equipo) {
            equipo.ultimoMantenimiento = mantenimiento.fecha;
            DataManager.save(DataManager.keys.equipos, this.equipos);
        }

        this.renderEquipos();
        this.renderMantenimientos();
        closeModal();
        e.target.reset();
    }

    renderEquipos() {
        const tbody = document.getElementById('equipos-tbody');
        if (!tbody) return;

        if (this.equipos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay equipos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = this.equipos.map(equipo => `
            <tr>
                <td>${equipo.nombre}</td>
                <td>${equipo.tipo}</td>
                <td>${equipo.modelo}</td>
                <td><span class="status-badge status-${equipo.estado.toLowerCase().replace(' ', '-')}">${equipo.estado}</span></td>
                <td>${equipo.ultimoMantenimiento || 'N/A'}</td>
                <td>${equipo.proximoMantenimiento || 'N/A'}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="editEquipo('${equipo.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderMantenimientos() {
        const tbody = document.getElementById('mantenimientos-tbody');
        if (!tbody) return;

        if (this.mantenimientos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay mantenimientos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = this.mantenimientos.map(mantenimiento => {
            const equipo = this.equipos.find(e => e.id === mantenimiento.equipo);
            return `
                <tr>
                    <td>${mantenimiento.fecha}</td>
                    <td>${equipo ? equipo.nombre : 'N/A'}</td>
                    <td>${mantenimiento.tipo}</td>
                    <td>${mantenimiento.descripcion}</td>
                    <td>₡${mantenimiento.costo.toLocaleString()}</td>
                    <td>${mantenimiento.tecnico || 'N/A'}</td>
                </tr>
            `;
        }).join('');
    }
}

class ReportesManager {
    constructor() {
    }

    actualizarReportes() {
        const periodo = parseInt(document.getElementById('periodo-reporte')?.value || 30);
        const tipo = document.getElementById('tipo-reporte')?.value || 'ventas';
        
        // Implementar lógica de generación de reportes
        console.log(`Actualizando reportes para ${periodo} días, tipo: ${tipo}`);
        
        this.updateVentasStats(periodo);
        this.updateProductosChart();
        this.updateClientesChart();
    }

    updateVentasStats(periodo) {
        const ventasElement = document.getElementById('ventas-periodo');
        const margenElement = document.getElementById('margen-promedio');
        const topProductoElement = document.getElementById('producto-top');

        if (ventasElement) ventasElement.textContent = '₡0';
        if (margenElement) margenElement.textContent = '0%';
        if (topProductoElement) topProductoElement.textContent = '-';
    }

    updateProductosChart() {
        const chartElement = document.getElementById('productos-chart');
        if (chartElement) {
            chartElement.innerHTML = '<p>Cargando datos de productos...</p>';
        }
    }

    updateClientesChart() {
        const chartElement = document.getElementById('clientes-chart');
        if (chartElement) {
            chartElement.innerHTML = '<p>Cargando datos de clientes...</p>';
        }
    }
}

class FinanzasManager {
    constructor() {
        this.ingresos = DataManager.load(DataManager.keys.ingresos);
        this.gastos = DataManager.load(DataManager.keys.gastos);
        this.initEventListeners();
    }

    initEventListeners() {
        const ingresoForm = document.getElementById('ingreso-form');
        const gastoForm = document.getElementById('gasto-form');
        
        if (ingresoForm) {
            ingresoForm.addEventListener('submit', (e) => this.handleIngresoSubmit(e));
        }
        if (gastoForm) {
            gastoForm.addEventListener('submit', (e) => this.handleGastoSubmit(e));
        }
    }

    handleIngresoSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const ingreso = Object.fromEntries(formData.entries());
        
        ingreso.id = Date.now().toString();
        ingreso.monto = parseFloat(ingreso.monto);
        ingreso.tipo = 'Ingreso';

        this.ingresos.push(ingreso);
        DataManager.save(DataManager.keys.ingresos, this.ingresos);
        this.renderMovimientos();
        this.updateFinanzasStats();
        closeModal();
        e.target.reset();
    }

    handleGastoSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const gasto = Object.fromEntries(formData.entries());
        
        gasto.id = Date.now().toString();
        gasto.monto = parseFloat(gasto.monto);
        gasto.tipo = 'Gasto';

        this.gastos.push(gasto);
        DataManager.save(DataManager.keys.gastos, this.gastos);
        this.renderMovimientos();
        this.updateFinanzasStats();
        closeModal();
        e.target.reset();
    }

    renderMovimientos() {
        const tbody = document.getElementById('movimientos-tbody');
        if (!tbody) return;

        const movimientos = [...this.ingresos, ...this.gastos]
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        if (movimientos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay movimientos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = movimientos.map(movimiento => `
            <tr>
                <td>${movimiento.fecha}</td>
                <td><span class="status-badge status-${movimiento.tipo.toLowerCase()}">${movimiento.tipo}</span></td>
                <td>${movimiento.categoria}</td>
                <td>${movimiento.descripcion}</td>
                <td class="${movimiento.tipo === 'Ingreso' ? 'text-success' : 'text-error'}">
                    ${movimiento.tipo === 'Ingreso' ? '+' : '-'}₡${movimiento.monto.toLocaleString()}
                </td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="editMovimiento('${movimiento.id}', '${movimiento.tipo}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateFinanzasStats() {
        const fechaActual = new Date();
        const inicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
        
        const ingresosMes = this.ingresos
            .filter(i => new Date(i.fecha) >= inicioMes)
            .reduce((sum, i) => sum + i.monto, 0);
            
        const gastosMes = this.gastos
            .filter(g => new Date(g.fecha) >= inicioMes)
            .reduce((sum, g) => sum + g.monto, 0);
            
        const balance = ingresosMes - gastosMes;

        const ingresosElement = document.getElementById('ingresos-mes');
        const gastosElement = document.getElementById('gastos-mes');
        const balanceElement = document.getElementById('balance-mes');
        const flujoElement = document.getElementById('flujo-caja');

        if (ingresosElement) ingresosElement.textContent = `₡${ingresosMes.toLocaleString()}`;
        if (gastosElement) gastosElement.textContent = `₡${gastosMes.toLocaleString()}`;
        if (balanceElement) {
            balanceElement.textContent = `₡${balance.toLocaleString()}`;
            balanceElement.className = balance >= 0 ? 'text-success' : 'text-error';
        }
        if (flujoElement) flujoElement.textContent = `₡${balance.toLocaleString()}`;
    }
}

// Variables globales para los nuevos managers
let clienteManager, cotizacionManager, proveedorManager, equipoManager, reportesManager, finanzasManager;

// Funciones para abrir modales de los nuevos módulos
function openClienteModal() {
    showModal('cliente-modal');
}

function openCotizacionModal() {
    const clienteSelect = document.getElementById('cotizacion-cliente');
    const clientes = DataManager.load(DataManager.keys.clientes);
    clienteSelect.innerHTML = '<option value="">Seleccionar cliente</option>';
    clientes.forEach(cliente => {
        clienteSelect.innerHTML += `<option value="${cliente.id}">${cliente.nombre}</option>`;
    });
    showModal('cotizacion-modal');
}

function openProveedorModal() {
    showModal('proveedor-modal');
}

function openCompraModal() {
    const proveedorSelect = document.getElementById('compra-proveedor');
    const proveedores = DataManager.load(DataManager.keys.proveedores);
    proveedorSelect.innerHTML = '<option value="">Seleccionar proveedor</option>';
    proveedores.forEach(proveedor => {
        proveedorSelect.innerHTML += `<option value="${proveedor.id}">${proveedor.nombre}</option>`;
    });
    document.getElementById('compra-fecha').value = new Date().toISOString().split('T')[0];
    showModal('compra-modal');
}

function openEquipoModal() {
    showModal('equipo-modal');
}

function openMantenimientoModal() {
    const equipoSelect = document.getElementById('mantenimiento-equipo');
    const equipos = DataManager.load(DataManager.keys.equipos);
    equipoSelect.innerHTML = '<option value="">Seleccionar equipo</option>';
    equipos.forEach(equipo => {
        equipoSelect.innerHTML += `<option value="${equipo.id}">${equipo.nombre}</option>`;
    });
    document.getElementById('mantenimiento-fecha').value = new Date().toISOString().split('T')[0];
    showModal('mantenimiento-modal');
}

function openIngresoModal() {
    document.getElementById('ingreso-fecha').value = new Date().toISOString().split('T')[0];
    showModal('ingreso-modal');
}

function openGastoModal() {
    document.getElementById('gasto-fecha').value = new Date().toISOString().split('T')[0];
    showModal('gasto-modal');
}

// Funciones auxiliares para cotizaciones
function addCotizacionItem() {
    const container = document.getElementById('cotizacion-items-container');
    const newItem = document.createElement('div');
    newItem.className = 'cotizacion-item';
    newItem.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Descripción</label>
                <input type="text" name="item-descripcion" required>
            </div>
            <div class="form-group">
                <label>Cantidad</label>
                <input type="number" name="item-cantidad" min="1" value="1" required>
            </div>
            <div class="form-group">
                <label>Precio Unitario</label>
                <input type="number" name="item-precio" min="0" step="0.01" required>
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-danger btn-small" onclick="removeItem(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    container.appendChild(newItem);
}

function removeItem(button) {
    button.closest('.cotizacion-item').remove();
}

// Funciones para reportes
function actualizarReportes() {
    if (reportesManager) {
        reportesManager.actualizarReportes();
    }
}

function exportarReporte() {
    console.log('Exportando reporte...');
}

// ========================================
// EVENT LISTENERS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar navegación
    const nav = new NavigationManager();

    // Event listeners para cerrar modales
    document.getElementById('modal-overlay').addEventListener('click', closeModal);
    
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', closeModal);
    });



    // Prevenir que el modal se cierre al hacer clic dentro del contenido
    document.querySelectorAll('.modal-content').forEach(content => {
        content.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });

    // Event listener para formulario de productos
    document.getElementById('producto-modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        ProductManager.saveProduct(formData);
    });

    // Event listener para formulario de insumos
    document.getElementById('insumo-modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        InsumoManager.saveInsumo(formData);
    });

    // Event listener para calculadora
    document.getElementById('calc-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        CostCalculator.calculate(formData);
    });

    // Event listener para formulario de pedidos
    document.getElementById('pedido-modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        PedidoManager.savePedido(formData);
    });

    // Event listener para formulario de facturación
    document.getElementById('factura-modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const cliente = document.getElementById('factura-cliente').value;
        const telefono = document.getElementById('factura-telefono').value;
        
        const items = [];
        document.querySelectorAll('.factura-item').forEach(itemDiv => {
            const descripcion = itemDiv.querySelector('.item-descripcion').value;
            const cantidad = parseInt(itemDiv.querySelector('.item-cantidad').value);
            const precio = parseFloat(itemDiv.querySelector('.item-precio').value);
            
            if (descripcion && cantidad && precio) {
                items.push({ descripcion, cantidad, precio });
            }
        });

        if (items.length === 0) {
            alert('Debe agregar al menos un item a la factura');
            return;
        }

        const facturaData = { cliente, telefono, items };
        FacturacionManager.createFactura(facturaData);
        closeModal();
    });

    // Event listener para configuración
    document.getElementById('config-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        ConfigManager.saveConfig(formData);
    });

    // Event listener para formulario de consumo
    document.getElementById('consumo-modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        ConsumoManager.saveConsumo(formData);
    });

    // Event listener para cambio de material en modal de consumo
    document.getElementById('consumo-material').addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const cantidadInput = document.getElementById('consumo-cantidad');
        
        if (selectedOption.dataset.disponible) {
            const disponibleKg = parseFloat(selectedOption.dataset.disponible);
            const disponibleGramos = disponibleKg * 1000;
            cantidadInput.max = disponibleGramos;
            cantidadInput.title = `Máximo disponible: ${disponibleGramos}g (${disponibleKg}kg)`;
        } else {
            cantidadInput.removeAttribute('max');
            cantidadInput.title = '';
        }
    });

    // Event listeners para filtros de consumo
    document.getElementById('filtro-material-consumo').addEventListener('change', function() {
        ConsumoManager.renderConsumoHistory();
    });

    document.getElementById('filtro-periodo').addEventListener('change', function() {
        ConsumoManager.renderConsumoHistory();
    });

    // Event listener para resize de ventana
    window.addEventListener('resize', function() {
        // Cerrar menú móvil si se cambia a desktop
        if (window.innerWidth > 1023) {
            closeMobileMenu();
        }
    });

    // Event listener para tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Cerrar modal si está abierto
            if (document.querySelector('.modal.active')) {
                closeModal();
            }
            // Cerrar menú móvil si está abierto
            else if (document.querySelector('.sidebar.mobile-open')) {
                closeMobileMenu();
            }
        }
    });

    // Prevenir scroll del body cuando el menú móvil está abierto
    const sidebar = document.getElementById('sidebar');
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                if (sidebar.classList.contains('mobile-open')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            }
        });
    });
    
    observer.observe(sidebar, { attributes: true });

    // Inicializar managers de nuevos módulos
    clienteManager = new ClienteManager();
    cotizacionManager = new CotizacionManager();
    proveedorManager = new ProveedorManager();
    equipoManager = new EquipoManager();
    reportesManager = new ReportesManager();
    finanzasManager = new FinanzasManager();

    // Cargar datos iniciales
    DashboardManager.updateStats();
    
    console.log('3D Control Center iniciado correctamente');
});