const contenedor = document.getElementById("repositorio");
const filtrosContenedor = document.getElementById("filtros");
const filtrosActivos = document.getElementById("filtros-activos");

const filtroAnio = document.getElementById("filtro-anio");
const filtroTipo = document.getElementById("filtro-tipo");
const filtroColeccion = document.getElementById("filtro-coleccion");
const filtroTema = document.getElementById("filtro-tema");

const JSON_URL = "documentos-repositorio.json";
const ITEMS_POR_PAGINA = 10;

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
  if (tema) {
    docsFiltrados = docsFiltrados.filter(d => {
      if (!d.tema) return false;
      if (Array.isArray(d.tema)) {
        return d.tema.includes(tema);
      } else {
        return d.tema === tema;
      }
    });
  }

  mostrarFiltros({ year, type: tipo, coleccion, tema });
  construirSelects(documentos);

  const totalPaginas = Math.ceil(docsFiltrados.length / ITEMS_POR_PAGINA);
  const paginaActual = Math.min(Math.max(pagParam, 1), totalPaginas);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const docsPagina = docsFiltrados.slice(inicio, fin);

  const tituloRepositorio = tipo ? `DOCUMENTOS – ${tipo}` : "DOCUMENTOS";
  const cantidadDocs = docsFiltrados.length;
  const leyendaCantidad = `Se ${cantidadDocs === 1 ? "encontró" : "encontraron"} ${cantidadDocs} documento${cantidadDocs !== 1 ? "s" : ""}.`;

  contenedor.innerHTML = `
  <h1>${tituloRepositorio}</h1>
  <p class="cantidad-documentos">${leyendaCantidad}</p>
  <div class="lista-documentos">` +
    docsPagina.map(d => `
      <div class="item">
        <img src="${d.portada}" alt="Portada de ${d.titulo}">
        <div class="info">
          <span class="fecha">${formatearFecha(d.fecha)}</span>
          <a href="?doc=${d.slug}"><strong>${d.titulo}</strong></a>
          <div class="tags-div">Tipo: 
            <span class="tag tag-tipo" data-tipo="${d.tipo_documento}">${d.tipo_documento}</span>
          </div>
          ${d.tema ? `
          <div class="tags-div">Tema: ${Array.isArray(d.tema)
          ? d.tema.map(t => `<span class="tag tag-tema" data-tema="${t}">${t}</span>`).join(" ")
          : `<span class="tag tag-tema" data-tema="${d.tema}">${d.tema}</span>`
        }</div>` : ''}
          ${d.coleccion ? `
          <div class="tags-div">Colección: 
            <span class="tag tag-coleccion" data-coleccion="${d.coleccion}">${d.coleccion}</span>
          </div>` : ''}
        </div>
      </div>
    `).join("") +
    `</div>` +
    generarControlesPaginacion(paginaActual, totalPaginas);

  // Agregar eventos a las etiquetas clickeables
  document.querySelectorAll('.tag-tipo').forEach(tag => {
    tag.addEventListener('click', () => {
      aplicarFiltro('type', tag.dataset.tipo);
    });
  });

  document.querySelectorAll('.tag-coleccion').forEach(tag => {
    tag.addEventListener('click', () => {
      aplicarFiltro('coleccion', tag.dataset.coleccion);
    });
  });

  document.querySelectorAll('.tag-tema').forEach(tag => {
    tag.addEventListener('click', () => {
      aplicarFiltro('tema', tag.dataset.tema);
    });
  });
}

async function mostrarDetalle(slug) {
  const doc = documentos.find(d => d.slug === slug);
  if (!doc) {
    contenedor.innerHTML = `<p>Documento no encontrado.</p><a href="index.html">← Volver</a>`;
    return;
  }

  try {
    const res = await fetch("detalle.html");
    const html = await res.text();
    contenedor.innerHTML = html;

    // Portada
    document.getElementById("portada-doc").src = doc.portada;
    document.getElementById("portada-doc").alt = `Portada de ${doc.titulo}`;

    // Titulo principal
    document.getElementById("main-titulo-doc").textContent = doc.titulo;

    // Campos básicos
    document.getElementById("titulo-doc").textContent = doc.titulo;
    document.getElementById("fecha-doc").textContent = formatearFecha(doc.fecha);
    document.getElementById("link-descarga").href = doc.archivo.trim();

    // Enlace del archivo
    document.getElementById("url-doc").textContent = doc.archivo.trim();
    document.getElementById("url-doc").href = doc.archivo.trim();

    // Autores del documento
    if (doc.autor && Array.isArray(doc.autor)) {
      document.getElementById("autor-doc").textContent = doc.autor.join(", ");
    }

    // Tipo de documento como etiqueta
    if (doc.tipo_documento) {
      document.getElementById("tipo-doc").innerHTML = `<span class="tag tag-tipo">${doc.tipo_documento}</span>`;
    }

    // Colección como etiqueta
    if (doc.coleccion) {
      document.getElementById("coleccion-doc").innerHTML = `<span class="tag tag-coleccion">${doc.coleccion}</span>`;
    }

    // Tema como etiquetas
    if (doc.tema) {
      const temas = Array.isArray(doc.tema)
        ? doc.tema.map(t => `<span class="tag tag-tema">${t}</span>`).join(" ")
        : `<span class="tag tag-tema">${doc.tema}</span>`;
      document.getElementById("tema-doc").innerHTML = temas;
    }

  } catch (error) {
    contenedor.innerHTML = `<p>Error al cargar el detalle del documento.</p>`;
  }

  // Oculta el sidebar de filtros si existe
  const filtros = document.getElementById("filtros");
  if (filtros) filtros.style.display = "none";
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

  // Aquí la clave: usamos flatMap para extraer todos los temas independientemente de si vienen como string o array
  const temas = [...new Set(
    data.flatMap(d => Array.isArray(d.tema) ? d.tema : (d.tema ? [d.tema] : []))
  )].filter(Boolean).sort();

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
