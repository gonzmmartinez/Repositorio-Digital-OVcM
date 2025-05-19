const contenedor = document.getElementById("repositorio");
const filtrosContenedor = document.getElementById("filtros");
const filtrosActivos = document.getElementById("filtros-activos");

const filtroAnio = document.getElementById("filtro-anio");
const filtroTipo = document.getElementById("filtro-tipo");
const filtroColeccion = document.getElementById("filtro-coleccion");
const filtroTema = document.getElementById("filtro-tema");

const JSON_URL = "documentos-repositorio.json";
const ITEMS_POR_PAGINA = 15;

let documentos = [];

async function cargarDocumentos() {
  try {
    const res = await fetch(JSON_URL);
    documentos = await res.json();
    documentos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    renderizar();
  } catch (error) {
    contenedor.innerHTML = `<p>Error al cargar los documentos.</p>`;
  }
}

function renderizar() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("doc");
  const pagParam = parseInt(params.get("pag")) || 1;

  if (slug) return mostrarDetalle(slug);

  const year = params.get("year");
  const tipo = params.get("type");
  const coleccion = params.get("coleccion");
  const tema = params.get("tema");

  let docsFiltrados = documentos;

  if (year) docsFiltrados = docsFiltrados.filter(d => new Date(d.fecha).getFullYear() == year);
  if (tipo) docsFiltrados = docsFiltrados.filter(d => d.tipo_documento === tipo);
  if (coleccion) docsFiltrados = docsFiltrados.filter(d => d.coleccion === coleccion);
  if (tema) docsFiltrados = docsFiltrados.filter(d => d.tema === tema);

  mostrarFiltros({ year, type: tipo, coleccion, tema });
  construirSelects(documentos);

  const totalPaginas = Math.ceil(docsFiltrados.length / ITEMS_POR_PAGINA);
  const paginaActual = Math.min(Math.max(pagParam, 1), totalPaginas);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const docsPagina = docsFiltrados.slice(inicio, fin);

  contenedor.innerHTML = `<h1>Repositorio Digital</h1><div class="lista-documentos">` +
    docsPagina.map(d => `
      <div class="item">
        <img src="${d.portada}" alt="Portada de ${d.titulo}">
        <div class="info">
          <a href="?doc=${d.slug}"><strong>${d.titulo}</strong></a><br>
          <span class="tipo">${d.tipo_documento}</span><br>
          <span class="fecha">${formatearFecha(d.fecha)}</span>
        </div>
      </div>
    `).join("") +
    `</div>` +
    generarControlesPaginacion(paginaActual, totalPaginas);
}

function mostrarDetalle(slug) {
  const doc = documentos.find(d => d.slug === slug);
  if (!doc) {
    contenedor.innerHTML = `<p>Documento no encontrado.</p><a href="index.html">← Volver</a>`;
    return;
  }
  contenedor.innerHTML = `
    <h2>${doc.titulo}</h2>
    <p><strong>Tipo de documento:</strong> ${doc.tipo_documento}</p>
    <p><strong>Fecha:</strong> ${formatearFecha(doc.fecha)}</p>
    ${doc.coleccion ? `<p><strong>Colección:</strong> ${doc.coleccion}</p>` : ""}
    ${doc.tema ? `<p><strong>Tema:</strong> ${doc.tema}</p>` : ""}
    <p><a href="${doc.archivo.trim()}" target="_blank" download>📄 Descargar PDF</a></p>
    <p><a href="index.html">← Volver al repositorio</a></p>
  `;
}

function formatearFecha(fechaISO) {
  const opciones = { year: "numeric", month: "long" };
  const fecha = new Date(fechaISO).toLocaleDateString("es-AR", opciones);
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

function generarControlesPaginacion(actual, total) {
  if (total <= 1) return "";
  const params = new URLSearchParams(window.location.search);
  let html = `<div class="paginacion">`;

  if (actual > 1) {
    params.set("pag", actual - 1);
    html += `<a href="?${params}">← Anterior</a>`;
  }
  if (actual < total) {
    params.set("pag", actual + 1);
    html += `<a href="?${params}">Siguiente →</a>`;
  }

  html += `</div>`;
  return html;
}

function construirSelects(data) {
  const years = [...new Set(data.map(d => new Date(d.fecha).getFullYear()))].sort((a, b) => b - a);
  const tipos = [...new Set(data.map(d => d.tipo_documento))].filter(Boolean).sort();
  const colecciones = [...new Set(data.map(d => d.coleccion))].filter(Boolean).sort();
  const temas = [...new Set(data.map(d => d.tema))].filter(Boolean).sort();

  filtroAnio.innerHTML = `<label>Año</label><select><option value="">Todos</option>` +
    years.map(y => `<option value="${y}">${y}</option>`).join("") + `</select>`;

  filtroTipo.innerHTML = `<label>Tipo</label><select><option value="">Todos</option>` +
    tipos.map(t => `<option value="${t}">${t}</option>`).join("") + `</select>`;

  filtroColeccion.innerHTML = `<label>Colección</label><select><option value="">Todas</option>` +
    colecciones.map(c => `<option value="${c}">${c}</option>`).join("") + `</select>`;

  filtroTema.innerHTML = `<label>Tema</label><select><option value="">Todos</option>` +
    temas.map(t => `<option value="${t}">${t}</option>`).join("") + `</select>`;

  const selects = [
    { div: filtroAnio, key: "year" },
    { div: filtroTipo, key: "type" },
    { div: filtroColeccion, key: "coleccion" },
    { div: filtroTema, key: "tema" }
  ];

  selects.forEach(({ div, key }) => {
    const select = div.querySelector("select");
    const valorActual = new URLSearchParams(window.location.search).get(key);
    select.value = valorActual || "";
    select.addEventListener("change", () => aplicarFiltro(key, select.value));
  });
}

function aplicarFiltro(nombre, valor) {
  const params = new URLSearchParams(window.location.search);
  if (valor) {
    params.set(nombre, valor);
  } else {
    params.delete(nombre);
  }
  params.delete("pag");
  window.location.search = params.toString();
}

function mostrarFiltros(filtros) {
  filtrosActivos.innerHTML = "";
  const etiquetas = {
    year: "Año",
    type: "Tipo",
    coleccion: "Colección",
    tema: "Tema"
  };

  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor) {
      const tag = document.createElement("span");
      tag.className = "filtro-tag";
      tag.innerHTML = `${etiquetas[clave]}: ${valor} <button data-clave="${clave}">✕</button>`;
      filtrosActivos.appendChild(tag);
    }
  });

  filtrosActivos.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const clave = btn.dataset.clave;
      const params = new URLSearchParams(window.location.search);
      params.delete(clave);
      params.delete("pag");
      window.location.search = params.toString();
    });
  });
}

cargarDocumentos();
